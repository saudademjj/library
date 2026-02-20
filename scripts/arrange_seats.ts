
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Load .env.local

import { getDb } from "../src/db";
import { seats, zones } from "../src/db/schema";
import { eq, asc } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("开始自动排列座位...");

  // 获取所有区域
  const allZones = await db.select().from(zones);

  for (const zone of allZones) {
    console.log(`处理区域: ${zone.name} (ID: ${zone.id})`);

    // 获取该区域下的所有座位，按座位号排序
    const zoneSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.zoneId, zone.id))
      .orderBy(asc(seats.seatNumber));

    if (zoneSeats.length === 0) {
      console.log("  - 无座位，跳过");
      continue;
    }

    // 网格配置
    const START_X = 50;
    const START_Y = 50;
    const GAP_X = 80; // 水平间距
    const GAP_Y = 80; // 垂直间距
    const COLS = 10;  // 每行10个座位

    let updatedCount = 0;

    for (let i = 0; i < zoneSeats.length; i++) {
      const seat = zoneSeats[i];
      
      // 计算行列 (0-based)
      const row = Math.floor(i / COLS);
      const col = i % COLS;

      // 计算坐标
      const x = START_X + col * GAP_X;
      const y = START_Y + row * GAP_Y;

      // 更新座位
      await db
        .update(seats)
        .set({ x, y })
        .where(eq(seats.id, seat.id));

      updatedCount++;
    }

    console.log(`  - 已更新 ${updatedCount} 个座位的坐标`);
  }

  console.log("所有座位排列完成！");
  process.exit(0);
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
