import { PrismaClient, Role, InventoryType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminHash = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { phone: "+998901234567" },
    update: {},
    create: {
      name: "Administrator",
      phone: "+998901234567",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  // Manager
  const managerHash = await bcrypt.hash("Manager@123", 12);
  await prisma.user.upsert({
    where: { phone: "+998901234568" },
    update: {},
    create: {
      name: "Sardor Meneger",
      phone: "+998901234568",
      passwordHash: managerHash,
      role: Role.MANAGER,
    },
  });

  // Operator
  const operatorHash = await bcrypt.hash("Operator@123", 12);
  await prisma.user.upsert({
    where: { phone: "+998901234569" },
    update: {},
    create: {
      name: "Zulfiya Operator",
      phone: "+998901234569",
      passwordHash: operatorHash,
      role: Role.OPERATOR,
    },
  });

  // Driver
  const driverHash = await bcrypt.hash("Driver@123", 12);
  await prisma.user.upsert({
    where: { phone: "+998901234570" },
    update: {},
    create: {
      name: "Jasur Haydovchi",
      phone: "+998901234570",
      passwordHash: driverHash,
      role: Role.DRIVER,
    },
  });

  // Inventory initial state
  for (const type of Object.values(InventoryType)) {
    await prisma.inventory.upsert({
      where: { type },
      update: {},
      create: { type, quantity: type === InventoryType.FULL_BOTTLE ? 100 : 50 },
    });
  }

  // Sample customers
  const customers = [
    { name: "Alisher Nazarov", phone: "+998901111111", address: "Yunusobod 5-kv, 23-uy" },
    { name: "Malika Yusupova", phone: "+998901111112", address: "Chilonzor 9-kv, 45-uy" },
    { name: "Bobur Rahimov", phone: "+998901111113", address: "Shayxontohur 3-kv, 12-uy" },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (!existing) {
      await prisma.customer.create({
        data: { ...c, createdById: admin.id },
      });
    }
  }

  console.log("✅ Seeding complete!");
  console.log("\n📋 Test accounts:");
  console.log("  Admin:    +998901234567 / Admin@123");
  console.log("  Manager:  +998901234568 / Manager@123");
  console.log("  Operator: +998901234569 / Operator@123");
  console.log("  Driver:   +998901234570 / Driver@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
