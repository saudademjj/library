
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getDb } from "../src/db";
import { seats, zones, reservations, users } from "../src/db/schema";
import { count } from "drizzle-orm";

async function verify() {
    const db = getDb();
    console.log("🔍 验证数据库数据...");

    const userCount = await db.select({ count: count() }).from(users);
    const zoneCount = await db.select({ count: count() }).from(zones);
    const seatCount = await db.select({ count: count() }).from(seats);
    const reservationCount = await db.select({ count: count() }).from(reservations);

    console.log(`✅ 用户数量: ${userCount[0].count} (预期: 3)`);
    console.log(`✅ 区域数量: ${zoneCount[0].count} (预期: 4)`);
    console.log(`✅ 座位数量: ${seatCount[0].count} (预期: >100)`);
    console.log(`✅ 预约数量: ${reservationCount[0].count} (预期: 0)`);

    if (userCount[0].count === 3 && zoneCount[0].count === 4 && seatCount[0].count > 100) {
        console.log("\n✨ 验证通过！数据库修复成功。");
        process.exit(0);
    } else {
        console.error("\n❌ 验证失败！数据数量不符合预期。");
        process.exit(1);
    }
}

verify().catch((err) => {
    console.error("验证出错:", err);
    process.exit(1);
});
