import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

// Este seed NO crea empleados, ciudadanos, casos, tramites ni actividad de
// ejemplo: solo la cuenta real del Juez Supremo y el catalogo de medallas
// (tomado de la postulacion real). Los tipos de tramite y de plus los da de
// alta el propio Juez Supremo desde la web. El resto del personal se da de
// alta de verdad desde /dashboard/empleados o con el bot de Discord (/contratar).
async function main() {
  console.log("Sembrando base de datos…");

  const juezSupremo = await prisma.user.upsert({
    where: { email: "juezsupremo@doj.es" },
    update: {},
    create: {
      email: "juezsupremo@doj.es",
      passwordHash: await hash("supremo123"),
      nombre: "Henry",
      apellidos: "Morgan",
      dni: "DOJ-00001",
      discordId: "125701951140882433",
      role: "JUEZ_SUPREMO",
      legajo: "4158",
    },
  });

  // Los tipos de tramite y de plus NO se precargan con datos inventados: el
  // Juez Supremo los da de alta desde /dashboard/solicitudes y /dashboard/pluses.

  await Promise.all(
    [
      {
        nombre: "Medalla al Servicio Distinguido",
        categoria: "Mérito",
        descripcion: "Distingue una trayectoria de servicio ejemplar y leal al Departamento.",
        bonoNomina: 35000,
        objetivo: 4,
      },
      {
        nombre: "Medalla al Mérito Profesional",
        categoria: "Mérito",
        descripcion: "Reconoce la excelencia técnica y profesional sostenida en el desempeño del cargo.",
        bonoNomina: 40000,
        objetivo: 4,
      },
      {
        nombre: "Distintivo de Servicio · 10 audiencias",
        categoria: "Distintivo de Servicio",
        descripcion: "Se otorga tras participar en 10 audiencias judiciales.",
        bonoNomina: 0,
        objetivo: 10,
      },
    ].map((m) => prisma.medalla.upsert({ where: { nombre: m.nombre }, update: {}, create: m })),
  );

  console.log("Seed completado. Cuenta creada:", juezSupremo.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
