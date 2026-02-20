
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getDb } from "../src/db";
import { seats, zones, reservations } from "../src/db/schema";
import type { SeatType } from "../src/lib/types";

// 布局对象接口
interface LayoutObject {
  id: string;
  type: "table" | "wall" | "window" | "door" | "plant" | "pillar";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  label?: string;
}

type SeatSeed = {
  seatNumber: string;
  x: number;
  y: number;
  seatType: SeatType;
  facilities: string;
};

async function main() {
  const db = getDb();
  console.log("🌱 开始生成真实图书馆布局数据...");

  // 1. 清理现有数据
  console.log("🧹 清理旧数据...");
  await db.delete(reservations);
  await db.delete(seats);
  await db.delete(zones);
  // await db.delete(users); // 保留用户方便测试

  // 2. 确保有一个管理员用户
  /*
  const adminEmail = "admin@library.com";
  const existingAdmin = await db.select().from(users).where(sql`email = ${adminEmail}`);
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      name: "系统管理员",
      email: adminEmail,
      password: await hashPassword("admin123"),
      studentId: "ADMIN001",
      role: "admin",
      phone: "10000"
    });
    console.log("👤 创建管理员账户");
  }
  */

  // ==========================================
  // 区域 A: 静音自习室 (Quiet Study Room)
  // 特点：靠墙单人座，中间是矩阵式格子间
  // ==========================================
  console.log("🏗️ 创建区域 A: 静音自习室...");
  
  const layoutObjsA: LayoutObject[] = [];
  const seatsA: SeatSeed[] = [];
  
  // 墙壁轮廓 (800x600)
  layoutObjsA.push({ id: "wall-top", type: "wall", x: 0, y: 0, width: 800, height: 10 });
  layoutObjsA.push({ id: "wall-bottom", type: "wall", x: 0, y: 590, width: 800, height: 10 });
  layoutObjsA.push({ id: "wall-left", type: "wall", x: 0, y: 0, width: 10, height: 600 });
  layoutObjsA.push({ id: "wall-right", type: "wall", x: 790, y: 0, width: 10, height: 600 });
  layoutObjsA.push({ id: "door-main", type: "door", x: 350, y: 580, width: 100, height: 20 });
  layoutObjsA.push({ id: "window-left", type: "window", x: 0, y: 100, width: 10, height: 200 });

  // 1. 靠窗单人座 (左侧)
  // 桌子：长条桌
  layoutObjsA.push({ id: "table-window", type: "table", x: 20, y: 50, width: 60, height: 500, label: "靠窗区" });
  for (let i = 0; i < 8; i++) {
    seatsA.push({
      seatNumber: `A-W${i + 1}`,
      x: 35, // 修正：居中于桌子 (20 + 60/2 - 40/2 + 5偏移)
      y: 80 + i * 60,
      facilities: JSON.stringify({ hasWindow: true, hasSocket: true, isQuietZone: true }),
      seatType: "reading_table"
    });
  }

  // 2. 中央格子间 (3排 x 6列) - 减少一排以适应高度
  const startX = 140; 
  const startY = 80; // 上移一点
  const deskW = 80;
  const deskH = 60;
  const gapY = 40; // 减小垂直间距

  for (let row = 0; row < 3; row++) { // 改为 3 排
    // 每排桌子背景
    layoutObjsA.push({ 
      id: `table-center-${row}`, 
      type: "table", 
      x: startX, 
      y: startY + row * (deskH * 2 + gapY), 
      width: deskW * 6, 
      height: deskH * 2 
    });

    for (let col = 0; col < 6; col++) {
      // 上面一排
      seatsA.push({
        seatNumber: `A-C${row + 1}-${col + 1}A`,
        x: startX + col * deskW + 20,
        y: startY + row * (deskH * 2 + gapY) - 10,
        facilities: JSON.stringify({ hasSocket: true, hasLamp: true, isQuietZone: true }),
        seatType: "study_room"
      });
      // 下面一排
      seatsA.push({
        seatNumber: `A-C${row + 1}-${col + 1}B`,
        x: startX + col * deskW + 20,
        y: startY + row * (deskH * 2 + gapY) + deskH * 2 - 30,
        facilities: JSON.stringify({ hasSocket: true, hasLamp: true, isQuietZone: true }),
        seatType: "study_room"
      });
    }
  }

  // 增加：右侧靠墙单人座
  layoutObjsA.push({ id: "table-right-wall", type: "table", x: 700, y: 50, width: 60, height: 500, label: "静音区" });
  for (let i = 0; i < 8; i++) {
    seatsA.push({
      seatNumber: `A-E${i + 1}`,
      x: 710,
      y: 80 + i * 60,
      facilities: JSON.stringify({ hasSocket: true, isQuietZone: true }),
      seatType: "reading_table"
    });
  }

  const zoneA = await db.insert(zones).values({
    name: "3F 静音自习室",
    floor: 3,
    description: "专为深度学习设计的静音区域，配备独立阅读灯和电源。",
    layoutObjects: JSON.stringify(layoutObjsA)
  }).returning();


  for (const s of seatsA) {
    await db.insert(seats).values({ ...s, zoneId: zoneA[0].id });
  }

  // ==========================================
  // 区域 B: 协作阅览室 (Collaboration Area)
  // 特点：大圆桌，讨论区
  // ==========================================
  console.log("🏗️ 创建区域 B: 协作阅览室...");
  
  const layoutObjsB: LayoutObject[] = [];
  const seatsB: SeatSeed[] = [];

  layoutObjsB.push({ id: "wall-b-top", type: "wall", x: 0, y: 0, width: 800, height: 10 });
  layoutObjsB.push({ id: "plant-1", type: "plant", x: 750, y: 20, width: 40, height: 40 });
  layoutObjsB.push({ id: "plant-2", type: "plant", x: 20, y: 20, width: 40, height: 40 });

  // 3个大长桌 (小组讨论)
  const groupTableWidth = 160;
  const groupTableHeight = 100;
  
  for (let i = 0; i < 3; i++) {
    const tx = 100 + i * 250;
    const ty = 150;
    
    layoutObjsB.push({ 
      id: `table-group-${i}`, 
      type: "table", 
      x: tx, 
      y: ty, 
      width: groupTableWidth, 
      height: groupTableHeight,
      label: `小组 ${i+1}`
    });

    // 围坐 4 人
    seatsB.push({ seatNumber: `B-G${i+1}-1`, x: tx + 20, y: ty - 20, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) }); // 上
    seatsB.push({ seatNumber: `B-G${i+1}-2`, x: tx + 100, y: ty - 20, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) }); // 上
    seatsB.push({ seatNumber: `B-G${i+1}-3`, x: tx + 20, y: ty + groupTableHeight, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) }); // 下
    seatsB.push({ seatNumber: `B-G${i+1}-4`, x: tx + 100, y: ty + groupTableHeight, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) }); // 下
  }

  // 休闲沙发区 (右下角)
  layoutObjsB.push({ id: "sofa-area", type: "table", x: 500, y: 350, width: 250, height: 200, label: "休闲阅读区" });
  
  const sofaPositions = [
    { x: 530, y: 380 }, { x: 600, y: 380 }, { x: 670, y: 380 },
    { x: 530, y: 480 }, { x: 600, y: 480 }, { x: 670, y: 480 },
  ];
  
  sofaPositions.forEach((pos, idx) => {
    seatsB.push({
      seatNumber: `B-S${idx + 1}`,
      x: pos.x,
      y: pos.y,
      seatType: "standard",
      facilities: JSON.stringify({ isQuietZone: false, note: "休闲软座" })
    });
  });

  // 增加：左侧单人圆桌区
  layoutObjsB.push({ id: "round-table-area", type: "table", x: 50, y: 350, width: 400, height: 200, label: "独立阅览区" });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      seatsB.push({
        seatNumber: `B-R${row+1}-${col+1}`,
        x: 80 + col * 90,
        y: 380 + row * 80,
        seatType: "standard",
        facilities: JSON.stringify({ note: "单人圆桌" })
      });
    }
  }

  const zoneB = await db.insert(zones).values({
    name: "2F 协作阅览室",
    floor: 2,
    description: "适合小组讨论和休闲阅读，氛围轻松。",
    layoutObjects: JSON.stringify(layoutObjsB)
  }).returning();

  for (const s of seatsB) {
    await db.insert(seats).values({ ...s, zoneId: zoneB[0].id });
  }

  // ==========================================
  // 区域 C: 数字媒体中心 (Digital Media Lab)
  // 特点：电脑位，排排坐
  // ==========================================
  console.log("🏗️ 创建区域 C: 数字媒体中心...");
  
  const layoutObjsC: LayoutObject[] = [];
  const seatsC: SeatSeed[] = [];

  // 服务器机柜装饰
  layoutObjsC.push({ id: "server-rack-1", type: "pillar", x: 50, y: 50, width: 60, height: 100, label: "机柜" });
  layoutObjsC.push({ id: "server-rack-2", type: "pillar", x: 50, y: 200, width: 60, height: 100, label: "机柜" });

  // 电脑桌阵列 (5排，每排8座)
  const pcStartX = 200;
  const pcStartY = 50;
  const pcGapY = 100;
  
  for (let row = 0; row < 5; row++) {
    // 电脑桌
    layoutObjsC.push({ 
      id: `desk-pc-${row}`, 
      type: "table", 
      x: pcStartX, 
      y: pcStartY + row * pcGapY, 
      width: 500, 
      height: 60 
    });

    for (let col = 0; col < 8; col++) {
      seatsC.push({
        seatNumber: `C-PC${row + 1}-${col + 1}`,
        x: pcStartX + 30 + col * 60,
        y: pcStartY + row * pcGapY + 10,
        seatType: "computer_desk",
        facilities: JSON.stringify({ hasComputer: true, hasSocket: true })
      });
    }
  }

  const zoneC = await db.insert(zones).values({
    name: "4F 数字媒体中心",
    floor: 4,
    description: "配备高性能工作站，适合编程和多媒体编辑。",
    layoutObjects: JSON.stringify(layoutObjsC)
  }).returning();

  for (const s of seatsC) {
    await db.insert(seats).values({ ...s, zoneId: zoneC[0].id });
  }

  // ==========================================
  // 区域 D: 1F 综合服务大厅 (General Service Hall)
  // 布局：中轴对称，前台居中，左侧自助，右侧休闲，后方阅览
  // ==========================================
  console.log("🏗️ 创建区域 D: 1F 综合服务大厅...");
  
  const layoutObjsD: LayoutObject[] = [];

  // 1. 基础设施
  // 大门
  layoutObjsD.push({ id: "main-door-1", type: "door", x: 350, y: 580, width: 40, height: 20, label: "进" });
  layoutObjsD.push({ id: "main-door-2", type: "door", x: 410, y: 580, width: 40, height: 20, label: "出" });
  
  // 咨询服务台 (居中，长条形)
  layoutObjsD.push({ id: "service-desk", type: "table", x: 250, y: 450, width: 300, height: 60, label: "综合服务中心" });
  // 服务台工位 (不作为可预约座位，仅作为装饰或内部座位，这里简化不生成seat)

  // 装饰柱子
  layoutObjsD.push({ id: "pillar-1", type: "pillar", x: 150, y: 450, width: 40, height: 40 });
  layoutObjsD.push({ id: "pillar-2", type: "pillar", x: 610, y: 450, width: 40, height: 40 });

  // 2. 自助服务区 (左侧，整齐矩阵) - 仅作为装饰对象
  layoutObjsD.push({ id: "area-self", type: "table", x: 50, y: 150, width: 200, height: 250, label: "自助服务区" });
  
  // 自助机作为装饰物（type: computer_desk 仅用于标记，这里用 table 模拟）
  for(let row=0; row<2; row++) {
    for(let col=0; col<3; col++) {
      layoutObjsD.push({
        id: `kiosk-${row}-${col}`,
        type: "table", // 使用 table 类型作为装饰
        x: 80 + col * 60,
        y: 180 + row * 100,
        width: 40,
        height: 40,
        label: "自助机"
      });
    }
  }

  // 3. 休闲等待区 (右侧，沙发围合)
  // 茶几
  layoutObjsD.push({ id: "coffee-table-1", type: "table", x: 580, y: 200, width: 60, height: 60, label: "茶几" });
  layoutObjsD.push({ id: "coffee-table-2", type: "table", x: 580, y: 320, width: 60, height: 60, label: "茶几" });

  // 4. 临时阅览区 (后方，长条桌)
  for(let i=0; i<3; i++) {
    const tableY = 60;
    const tableX = 150 + i * 180;
    
    layoutObjsD.push({ 
      id: `read-table-${i}`, 
      type: "table", 
      x: tableX, 
      y: tableY, 
      width: 140, 
      height: 60,
      label: "阅览桌"
    });
  }

  // 绿植点缀
  layoutObjsD.push({ id: "plant-main-1", type: "plant", x: 20, y: 550, width: 50, height: 50 });
  layoutObjsD.push({ id: "plant-main-2", type: "plant", x: 730, y: 550, width: 50, height: 50 });

  await db.insert(zones).values({
    name: "1F 综合服务大厅",
    floor: 1,
    description: "提供图书借还、咨询服务及自助查询功能。（无需预约）",
    layoutObjects: JSON.stringify(layoutObjsD)
  }).returning();

  // 不生成座位数据
  // for (const s of seatsD) { ... } 

  console.log("🎉 所有真实布局数据生成完成！");
  process.exit(0);
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
