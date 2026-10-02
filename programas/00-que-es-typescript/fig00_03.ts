// fig00_03.ts
type Servicio = {
  nombre: string;
  url: string;
};

const servicio = JSON.parse(
  '{"nombre":"pagos","direccion":"https://pagos.example"}',
) as Servicio;

console.log(`${servicio.nombre}: ${servicio.url}`);
