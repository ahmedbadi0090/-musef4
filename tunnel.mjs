import { startTunnel } from "untun";

console.log("🚀 جاري تشغيل النفق لربط Django بالإنترنت...");

const tunnel = await startTunnel({
    port: 8000,           // المنفذ الخاص بسيرفر Django
    hostname: "localhost",
    protocol: "http"
});

if (tunnel) {
    const url = await tunnel.getURL();
    console.log("\n==============================================");
    console.log(`✅ النفق جاهز! الرابط الخاص بك هو:\n${url}`);
    console.log("==============================================\n");
    console.log("انسخ هذا الرابط وضعه كـ BASE_URL في ملف الـ API الخاص بالفرونت إند.");
} else {
    console.error("❌ فشل تشغيل النفق.");
}