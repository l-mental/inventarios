# AgroPartes Tractores S.R.L. — Sistema POS e Inventario en Laravel 11

Proyecto completo estructurado en **Laravel 11 (PHP 8.2+)** con migraciones, seeders de los **91 repuestos de tractores**, modelos Eloquent, controladores REST/Web y vistas Blade listas para usar.

## Requisitos en tu PC
- **PHP 8.2 o superior** (con extensiones `pdo_sqlite` o `pdo_mysql`, `mbstring`, `openssl`, `json`)
- **Composer** (`https://getcomposer.org/download/`)

## Instalación Rápida (Modo SQLite sin configurar servidor BD)
```bash
# 1. Entrar a la carpeta del proyecto
cd laravel-agropartes

# 2. Instalar dependencias de Laravel
composer install

# 3. Crear archivo de entorno y clave de aplicación
cp .env.example .env
php artisan key:generate

# 4. Crear archivo SQLite (en Windows PowerShell: New-Item database\database.sqlite -ItemType File)
touch database/database.sqlite

# 5. Ejecutar migraciones y cargar los 91 repuestos, proveedores y usuarios
php artisan migrate --seed

# 6. Iniciar el servidor local
php artisan serve
```

Abre en tu navegador: **http://127.0.0.1:8000**

## Usar con MySQL / XAMPP / Laragon (Opcional)
1. Crea una base de datos llamada `agropartes_tractores` en phpMyAdmin / MySQL.
2. En `.env` cambia:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=agropartes_tractores
   DB_USERNAME=root
   DB_PASSWORD=
   ```
3. Ejecuta:
   ```bash
   php artisan migrate:fresh --seed
   php artisan serve
   ```

## Credenciales Iniciales
- **Administrador:** usuario `admin` / contraseña `admin123`
- **Vendedor:** usuario `vendedor` / contraseña `vendedor123`

## Módulos Incluidos
- **Catálogo de 91 Repuestos:** Código interno, OEM/Equivalencias, Nombre, Categoría, Marca (`Massey Ferguson`, `New Holland`, `Fiat`, `Valmet Valtra`, `Universal`, `General`, `Todos`), Unidad, Proveedor, P. Compra, P. Venta, Stock Total, Stock Mínimo (acepta `0` sin falsas alertas) y Estado.
- **POS Mostrador y Caja:** Ventas en Efectivo, QR, Mixto y Crédito, Proformas, Puntos de fidelidad y Arqueo de Caja.
- **Anulación de Facturas:** Anulación con motivo y devolución automática del stock vendido y reversión de saldo crédito.
- **Traspasos entre Sucursales:** Movimiento directo de unidades entre `Sucursal Central`, `Sucursal Norte` y `Sucursal Sur` con registro en Kardex y Auditoría.
- **Tarjeta Flotante de Ventas:** Configurable en vivo por Día, Semana, Mes, Bimestre, Trimestre y Año.
