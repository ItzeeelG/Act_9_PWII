const { createPaypalOrder, capturePaypalOrder } = require('../servicio/paypal.service.js');
const conexion = require('../config/db'); // ← importar la conexión

// Helper para usar query con async/await
function query(sql, params) {
  return new Promise((resolve, reject) => {
    conexion.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

async function createOrder(req, res) {
  try {
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }
    if (!total || Number(total) <= 0) {
      return res.status(400).json({ error: 'El total es inválido' });
    }

    const order = await createPaypalOrder({ items, total });
    res.status(200).json({ id: order.id, status: order.status });

  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear la orden', detalle: error.message });
  }
}

async function captureOrder(req, res) {
  try {
    const { orderId, productos } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId es obligatorio' });
    }

    const captureData = await capturePaypalOrder(orderId);

    // Solo actualizar la BD si el pago fue exitoso
    if (captureData.status === 'COMPLETED') {
      for (const p of (productos || [])) {
        await query(
          'UPDATE productos SET inStock = inStock - ? WHERE id = ?',
          [p.inStock, p.id]
        );
      }
      console.log('Stock actualizado correctamente');
    }

    // Generar XML del recibo
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<recibo>\n`;
    for (const p of (productos || [])) {
      xml += `  <producto>\n`;
      xml += `    <id>${p.id}</id>\n`;
      xml += `    <nombre>${p.name}</nombre>\n`;
      xml += `    <precio>${p.price}</precio>\n`;
      xml += `    <cantidad>${p.inStock}</cantidad>\n`;
      xml += `    <subtotal>${p.price * p.inStock}</subtotal>\n`;
      xml += `    <categoria>${p.category}</categoria>\n`;
      xml += `    <descripcion>${p.description}</descripcion>\n`;
      xml += `  </producto>\n`;
    }
    const total = (productos || []).reduce((acc, p) => acc + p.price, 0);
    xml += `  <total>${total}</total>\n</recibo>`;

    res.status(200).json({
      ...captureData,
      xml: Buffer.from(xml).toString('base64')
    });

  } catch (error) {
    console.error('Error en captureOrder:', error.message);
    res.status(500).json({ error: 'No se pudo capturar la orden', detalle: error.message });
  }
}

module.exports = { createOrder, captureOrder };