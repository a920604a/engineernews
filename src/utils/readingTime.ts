export function calcReadingTime(body: string): number {
  const cjk = (body.match(/[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/g) ?? []).length;
  const words = (body.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef]/g, ' ').match(/\w+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 300 + words / 200));
}
