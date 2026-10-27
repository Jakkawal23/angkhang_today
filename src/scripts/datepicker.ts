// ปฏิทินเลือกวัน แสดงผลเป็น วัน/เดือน/ปี (ค.ศ.) เหมือนกันทุกเบราว์เซอร์และมือถือ
// ค่าที่ส่งในฟอร์ม / URL ยังเป็น YYYY-MM-DD เพื่อให้ระบบอ่านง่าย
import flatpickr from 'flatpickr';
import { Thai } from 'flatpickr/dist/l10n/th.js';
import 'flatpickr/dist/flatpickr.min.css';

type FpInput = HTMLInputElement & { _flatpickr?: flatpickr.Instance };

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function create(el: FpInput, extra: flatpickr.Options.Options = {}) {
  const fp = flatpickr(el, {
    locale: Thai,
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd/m/Y',
    altInputClass: el.className,
    minDate: 'today',
    disableMobile: true,
    monthSelectorType: 'static',
    ...extra,
  });
  // ให้ <label for="..."> ชี้ไปที่ช่องที่ผู้ใช้เห็น
  if (fp.altInput && el.id) {
    fp.altInput.id = el.id;
    el.id = `${el.id}-value`;
  }
  return fp;
}

/** เรียกหลังจากใส่ค่าเริ่มต้นจาก URL แล้ว (ค่าใน input จะกลายเป็นวันที่ที่เลือกไว้) */
export function initDatePickers(root: ParentNode = document) {
  const checkin = root.querySelector<FpInput>('input[data-date="checkin"]');
  const checkout = root.querySelector<FpInput>('input[data-date="checkout"]');
  if (checkin?._flatpickr || checkout?._flatpickr) return;

  const out = checkout
    ? create(checkout, { minDate: checkin?.value ? addDays(new Date(checkin.value), 1) : 'today' })
    : undefined;

  if (checkin) {
    create(checkin, {
      onChange([d]) {
        if (!d || !out) return;
        const next = addDays(d, 1);
        out.set('minDate', next);
        const cur = out.selectedDates[0];
        if (!cur || cur < next) out.setDate(next, true);
      },
    });
  }
}

export function clearDatePickers(root: ParentNode = document) {
  root.querySelectorAll<FpInput>('input[data-date]').forEach((el) => {
    el._flatpickr?.clear();
    el._flatpickr?.set('minDate', 'today');
  });
}
