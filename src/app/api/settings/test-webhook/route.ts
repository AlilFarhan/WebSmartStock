import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const webhookUrl = body.url?.trim();

    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return NextResponse.json({ error: 'URL Webhook tidak valid. Pastikan dimulai dengan http:// atau https://' }, { status: 400 });
    }

    const testPayload = {
      event: 'LOW_STOCK_ALERT',
      sku: 'TEST-SKU-999',
      product_name: 'Simulasi Produk SmartStock (Test Alert)',
      current_stock: 2,
      min_stock: 10,
      unit: 'pcs',
      timestamp: new Date().toISOString(),
      note: 'Ini adalah payload pengujian dari tombol Test Webhook SmartStock',
    };

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartStock-Alerts/1.0',
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      const responseText = await response.text();

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        responsePreview: responseText.slice(0, 200),
        message: response.ok
          ? `Webhook berhasil dipanggil! HTTP ${response.status} (${latencyMs}ms)`
          : `Target webhook merespons dengan HTTP ${response.status}: ${response.statusText}`,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return NextResponse.json({
        success: false,
        error: `Gagal menghubungi endpoint webhook: ${fetchErr.message || 'Timeout / Connection refused'}`,
      }, { status: 502 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
