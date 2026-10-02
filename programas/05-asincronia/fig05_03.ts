// fig05_03.ts
interface Servicio {
  readonly nombre: string;
}

type Estado = {
  servicio: Servicio;
  tipo: "disponible";
};

async function revisarUno(servicio: Servicio): Promise<Estado> {
  await Promise.resolve();
  return {
    servicio,
    tipo: "disponible",
  };
}

const estado = await revisarUno({ nombre: "catálogo" });
console.log(`${estado.servicio.nombre}: ${estado.tipo}`);
