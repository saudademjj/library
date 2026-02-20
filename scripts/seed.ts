/**
 * 数据库种子数据脚本
 * 用于初始化测试数据（包含3D坐标和设施信息）
 *
 * 运行方式: npm run db:seed
 */

import { config } from "dotenv";

// 加载环境变量
config({ path: ".env.local" });
config({ path: ".env" });

import { getDb } from "../src/db";
import { users, zones, seats, reservations } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

// 设施数据生成辅助函数
function generateFacilities(options: {
  hasSocket?: boolean;
  hasLamp?: boolean;
  hasComputer?: boolean;
  hasWindow?: boolean;
  isQuietZone?: boolean;
  socketCount?: number;
}) {
  return JSON.stringify({
    hasSocket: options.hasSocket || false,
    hasLamp: options.hasLamp || false,
    hasComputer: options.hasComputer || false,
    hasWindow: options.hasWindow || false,
    isQuietZone: options.isQuietZone || false,
    socketCount: options.socketCount || (options.hasSocket ? 2 : 0),
  });
}

async function seed() {
  console.log("🌱 开始填充种子数据（包含3D坐标）...\n");

  const db = getDb();

  try {
    // 0. 清空现有数据
    console.log("0️⃣  清空现有数据...");
    await db.delete(reservations);
    await db.delete(seats);
    await db.delete(zones);
    await db.delete(users);
    console.log("✅ 已清空所有表\n");

    // 1. 创建管理员和测试用户
    console.log("1️⃣  创建用户...");

    const adminPassword = await hashPassword("admin123");
    const studentPassword = await hashPassword("student123");

    const [, student1, student2] = await db
      .insert(users)
      .values([
        {
          name: "管理员",
          email: "admin@library.com",
          password: adminPassword,
          studentId: "ADMIN001",
          phone: "13800138000",
          role: "admin",
        },
        {
          name: "张三",
          email: "zhangsan@student.com",
          password: studentPassword,
          studentId: "2024001",
          phone: "13800138001",
          role: "student",
        },
        {
          name: "李四",
          email: "lisi@student.com",
          password: studentPassword,
          studentId: "2024002",
          phone: "13800138002",
          role: "student",
        },
      ])
      .returning();

    console.log(`✅ 创建了 3 个用户`);
    console.log(`   - 管理员: admin@library.com / admin123`);
    console.log(`   - 学生1: zhangsan@student.com / student123`);
    console.log(`   - 学生2: lisi@student.com / student123\n`);

    // 2. 创建区域（带颜色和边界框）
    console.log("2️⃣  创建区域（带3D属性）...");

    const [zone1, zone2, zone3] = await db
      .insert(zones)
      .values([
        {
          name: "A区 - 安静学习区",
          floor: 3,
          description: "适合需要安静环境的读者",
        },
        {
          name: "B区 - 普通阅览区",
          floor: 3,
          description: "普通阅览区域，环境舒适",
        },
        {
          name: "C区 - 讨论区",
          floor: 4,
          description: "适合小组讨论和协作学习",
        },
      ])
      .returning();

    console.log(`✅ 创建了 3 个区域\n`);

    // 3. 创建座位（带2D坐标和设施信息）
    console.log("3️⃣  创建座位（带2D坐标和设施）...");

    const seatData = [];

    // A区: 30个座位 (6行5列，安静学习区)
    console.log("   生成A区座位（6行×5列）...");
    let seatIndex = 0;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        seatIndex++;
        const isWindowSeat = col === 0; // 第一列靠窗
        seatData.push({
          seatNumber: `A-${seatIndex.toString().padStart(3, "0")}`,
          zoneId: zone1.id,
          x: Math.round(-120 + col * 20), // 假设比例调整
          y: Math.round(-80 + row * 30),
          rotation: 0,
          seatType: "standard" as const,
          facilities: generateFacilities({
            hasSocket: true,
            hasLamp: true,
            hasWindow: isWindowSeat,
            isQuietZone: true,
            socketCount: 2,
          }),
          note: isWindowSeat ? "靠窗位置" : undefined,
        });
      }
    }

    // B区: 40个座位 (8行5列，普通阅览区)
    console.log("   生成B区座位（8行×5列）...");
    seatIndex = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 5; col++) {
        seatIndex++;
        const hasComputer = seatIndex % 4 === 0; // 每4个座位配一台电脑
        const isWindowSeat = col === 4; // 最后一列靠窗
        seatData.push({
          seatNumber: `B-${seatIndex.toString().padStart(3, "0")}`,
          zoneId: zone2.id,
          x: Math.round(70 + col * 20),
          y: Math.round(-80 + row * 25),
          rotation: 0,
          seatType: hasComputer ? ("computer_desk" as const) : ("standard" as const),
          facilities: generateFacilities({
            hasSocket: true,
            hasLamp: seatIndex % 2 === 0, // 一半座位有台灯
            hasComputer,
            hasWindow: isWindowSeat,
            socketCount: hasComputer ? 3 : 1,
          }),
          note: hasComputer ? "配备电脑" : undefined,
        });
      }
    }

    // C区: 20个座位 (4行5列，讨论区)
    console.log("   生成C区座位（4行×5列）...");
    seatIndex = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        seatIndex++;
        const isStudyRoom = seatIndex % 5 === 0; // 每5个座位有一个研究室
        seatData.push({
          seatNumber: `C-${seatIndex.toString().padStart(3, "0")}`,
          zoneId: zone3.id,
          x: Math.round(-30 + col * 20),
          y: Math.round(-30 + row * 25),
          rotation: 0,
          seatType: isStudyRoom ? ("study_room" as const) : ("reading_table" as const),
          facilities: generateFacilities({
            hasSocket: true,
            hasLamp: false, // 讨论区不需要台灯
            hasComputer: false,
            socketCount: isStudyRoom ? 4 : 2,
          }),
          note: isStudyRoom ? "小组讨论室" : "适合小组讨论",
        });
      }
    }

    const createdSeats = await db.insert(seats).values(seatData).returning();

    console.log(`✅ 创建了 ${createdSeats.length} 个座位（带3D坐标和设施）`);
    console.log(`   - A区: 30个座位（安静学习区，6行×5列）`);
    console.log(`   - B区: 40个座位（普通阅览区，8行×5列）`);
    console.log(`   - C区: 20个座位（讨论区，4行×5列）\n`);

    // 4. 创建示例预约
    console.log("4️⃣  创建示例预约...");

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservationData = [
      {
        seatId: createdSeats[0].id, // A-001
        userId: student1.id,
        startTime: new Date(tomorrow.setHours(9, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(12, 0, 0, 0)),
        status: "active" as const,
      },
      {
        seatId: createdSeats[1].id, // A-002
        userId: student2.id,
        startTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(17, 0, 0, 0)),
        status: "active" as const,
      },
      {
        seatId: createdSeats[30].id, // B-001
        userId: student1.id,
        startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(13, 0, 0, 0)),
        status: "active" as const,
      },
    ];

    const createdReservations = await db
      .insert(reservations)
      .values(reservationData)
      .returning();

    console.log(`✅ 创建了 ${createdReservations.length} 个示例预约\n`);

    // 5. 显示统计信息
    console.log("📊 数据库统计信息:");
    console.log(`   - 用户: 3 个 (1 管理员, 2 学生)`);
    console.log(`   - 区域: 3 个（带颜色和3D边界）`);
    console.log(`   - 座位: ${createdSeats.length} 个（带3D坐标和设施）`);
    console.log(`   - 预约: ${createdReservations.length} 个`);
    console.log("\n📍 3D布局说明:");
    console.log(`   - A区: 位于(-15 ~ -5, -10 ~ 10)，绿色主题`);
    console.log(`   - B区: 位于(5 ~ 15, -10 ~ 10)，蓝色主题`);
    console.log(`   - C区: 位于(-5 ~ 5, -5 ~ 5)，橙色主题`);
    console.log("\n🔌 设施配置:");
    console.log(`   - A区: 全部配插座和台灯（安静学习）`);
    console.log(`   - B区: 部分配电脑和台灯（混合阅览）`);
    console.log(`   - C区: 配插座，适合讨论协作`);
    console.log("\n✅ 种子数据填充完成！");
    console.log("\n💡 提示:");
    console.log(`   - 启动服务器: npm run dev`);
    console.log(`   - 访问3D座位视图: http://localhost:3000/seats`);
    console.log(`   - 登录测试账号: admin@library.com / admin123`);

  } catch (error) {
    console.error("❌ 填充种子数据时出错:", error);
    throw error;
  }
}

// 运行脚本
seed()
  .then(() => {
    console.log("\n👋 脚本执行完成，正在退出...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 脚本执行失败:", error);
    process.exit(1);
  });
