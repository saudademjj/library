
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getDb } from "../src/db";
import { seats, zones, reservations, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
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
  console.log("🛠️  开始执行数据库完全修复 (Full Repair)...");

  // 1. 清理所有现有数据 (顺序很重要，因为有外键约束)
  console.log("🧹 正在清除所有旧数据...");
  try {
    await db.delete(reservations);
    console.log("   - 已清除预约记录");
    await db.delete(seats);
    console.log("   - 已清除座位数据");
    await db.delete(zones);
    console.log("   - 已清除区域数据");
    await db.delete(users);
    console.log("   - 已清除用户数据");
  } catch (e) {
    console.error("⚠️  清除数据时遇到问题 (可能是外键约束)，尝试使用 CASCADE 或手动处理...");
    throw e;
  }
  
  // 2. 重建用户
  console.log("👤 重建标准用户...");
  const adminPassword = await hashPassword("admin123");
  const studentPassword = await hashPassword("student123");

  await db.insert(users).values([
    {
      name: "系统管理员",
      email: "admin@library.com",
      password: adminPassword,
      studentId: "ADMIN001",
      role: "admin",
      phone: "10000",
      isActive: true
    },
    {
      name: "张三",
      email: "zhangsan@student.com",
      password: studentPassword,
      studentId: "2024001",
      role: "student",
      phone: "13800138001",
      isActive: true
    },
    {
      name: "李四",
      email: "lisi@student.com",
      password: studentPassword,
      studentId: "2024002",
      role: "student",
      phone: "13800138002",
      isActive: true
    }
  ]);
  console.log("   ✅ 已创建 Admin (admin@library.com) 和 2个测试学生");

  // ==========================================
  // 区域 A: 静音自习室 (Quiet Study Room)
  // ==========================================
  console.log("🏗️  重建区域 A: 静音自习室...");
  
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
  layoutObjsA.push({ id: "table-window", type: "table", x: 20, y: 50, width: 60, height: 500, label: "靠窗区" });
  for (let i = 0; i < 8; i++) {
    seatsA.push({
      seatNumber: `A-W${i + 1}`,
      x: 35, 
      y: 80 + i * 60,
      facilities: JSON.stringify({ hasWindow: true, hasSocket: true, isQuietZone: true }),
      seatType: "reading_table"
    });
  }

  // 2. 中央格子间
  const startX = 140; 
  const startY = 80;
  const deskW = 80;
  const deskH = 60;
  const gapY = 40;

  for (let row = 0; row < 3; row++) {
    layoutObjsA.push({ 
      id: `table-center-${row}`, 
      type: "table", 
      x: startX, 
      y: startY + row * (deskH * 2 + gapY), 
      width: deskW * 6, 
      height: deskH * 2 
    });

    for (let col = 0; col < 6; col++) {
      seatsA.push({
        seatNumber: `A-C${row + 1}-${col + 1}A`,
        x: startX + col * deskW + 20,
        y: startY + row * (deskH * 2 + gapY) - 10,
        facilities: JSON.stringify({ hasSocket: true, hasLamp: true, isQuietZone: true }),
        seatType: "study_room"
      });
      seatsA.push({
        seatNumber: `A-C${row + 1}-${col + 1}B`,
        x: startX + col * deskW + 20,
        y: startY + row * (deskH * 2 + gapY) + deskH * 2 - 30,
        facilities: JSON.stringify({ hasSocket: true, hasLamp: true, isQuietZone: true }),
        seatType: "study_room"
      });
    }
  }

  // 右侧靠墙单人座
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
  // 区域 B: 协作阅览室
  // ==========================================
  console.log("🏗️  重建区域 B: 协作阅览室...");
  
  const layoutObjsB: LayoutObject[] = [];
  const seatsB: SeatSeed[] = [];

  layoutObjsB.push({ id: "wall-b-top", type: "wall", x: 0, y: 0, width: 800, height: 10 });
  layoutObjsB.push({ id: "plant-1", type: "plant", x: 750, y: 20, width: 40, height: 40 });
  layoutObjsB.push({ id: "plant-2", type: "plant", x: 20, y: 20, width: 40, height: 40 });

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

    seatsB.push({ seatNumber: `B-G${i+1}-1`, x: tx + 20, y: ty - 20, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) });
    seatsB.push({ seatNumber: `B-G${i+1}-2`, x: tx + 100, y: ty - 20, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) });
    seatsB.push({ seatNumber: `B-G${i+1}-3`, x: tx + 20, y: ty + groupTableHeight, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) });
    seatsB.push({ seatNumber: `B-G${i+1}-4`, x: tx + 100, y: ty + groupTableHeight, seatType: "standard", facilities: JSON.stringify({ hasSocket: true, note: "小组讨论桌" }) });
  }

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
  // 区域 C: 数字媒体中心
  // ==========================================
  console.log("🏗️  重建区域 C: 数字媒体中心...");
  
  const layoutObjsC: LayoutObject[] = [];
  const seatsC: SeatSeed[] = [];

  layoutObjsC.push({ id: "server-rack-1", type: "pillar", x: 50, y: 50, width: 60, height: 100, label: "机柜" });
  layoutObjsC.push({ id: "server-rack-2", type: "pillar", x: 50, y: 200, width: 60, height: 100, label: "机柜" });

  const pcStartX = 200;
  const pcStartY = 50;
  const pcGapY = 100;
  
  for (let row = 0; row < 5; row++) {
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
  // 区域 D: 1F 综合服务大厅
  // ==========================================
  console.log("🏗️  重建区域 D: 1F 综合服务大厅...");
  
  const layoutObjsD: LayoutObject[] = [];
  // 区域D无可用座位，仅展示

  layoutObjsD.push({ id: "main-door-1", type: "door", x: 350, y: 580, width: 40, height: 20, label: "进" });
  layoutObjsD.push({ id: "main-door-2", type: "door", x: 410, y: 580, width: 40, height: 20, label: "出" });
  layoutObjsD.push({ id: "service-desk", type: "table", x: 250, y: 450, width: 300, height: 60, label: "综合服务中心" });
  layoutObjsD.push({ id: "pillar-1", type: "pillar", x: 150, y: 450, width: 40, height: 40 });
  layoutObjsD.push({ id: "pillar-2", type: "pillar", x: 610, y: 450, width: 40, height: 40 });
  layoutObjsD.push({ id: "area-self", type: "table", x: 50, y: 150, width: 200, height: 250, label: "自助服务区" });
  
  for(let row=0; row<2; row++) {
    for(let col=0; col<3; col++) {
      layoutObjsD.push({
        id: `kiosk-${row}-${col}`,
        type: "table",
        x: 80 + col * 60,
        y: 180 + row * 100,
        width: 40,
        height: 40,
        label: "自助机"
      });
    }
  }

  layoutObjsD.push({ id: "coffee-table-1", type: "table", x: 580, y: 200, width: 60, height: 60, label: "茶几" });
  layoutObjsD.push({ id: "coffee-table-2", type: "table", x: 580, y: 320, width: 60, height: 60, label: "茶几" });

  for(let i=0; i<3; i++) {
    layoutObjsD.push({ 
      id: `read-table-${i}`, 
      type: "table", 
      x: 150 + i * 180, 
      y: 60, 
      width: 140, 
      height: 60,
      label: "阅览桌"
    });
  }

  layoutObjsD.push({ id: "plant-main-1", type: "plant", x: 20, y: 550, width: 50, height: 50 });
  layoutObjsD.push({ id: "plant-main-2", type: "plant", x: 730, y: 550, width: 50, height: 50 });

  await db.insert(zones).values({
    name: "1F 综合服务大厅",
    floor: 1,
    description: "提供图书借还、咨询服务及自助查询功能。（无需预约）",
    layoutObjects: JSON.stringify(layoutObjsD)
  }).returning();

  console.log("🎉 数据库修复完成！所有数据已重置为初始状态。");
  process.exit(0);
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
