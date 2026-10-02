// fig05_08.ts
type Estado = {
  tipo: "disponible";
};

async function revisar(): Promise<Estado[]> {
  const tareas: Promise<Estado>[] = [];
  const resultados: Estado[] = await Promise.allSettled(tareas);
  return resultados;
}
