import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductCardComponent } from '../producto/producto.component';
import { ProductService } from '../../services/producto.service';
import { Product } from '../../models/producto.model';
import { CarritoService } from '../../services/carrito.service';
import { CarritoComponent } from '../carrito/carrito.component';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [ProductCardComponent, CarritoComponent],
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.css'],
})
export class CatalogoComponent {

  // inject() permite usar el servicio antes de que el constructor se ejecute
  private productService = inject(ProductService);
  private carritoService  = inject(CarritoService);

  products = toSignal(this.productService.getAll(), { initialValue: [] as Product[] });

  agregar(producto: Product) {
    this.carritoService.agregar(producto);
  }
}