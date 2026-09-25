import { useEffect, useRef, useState } from "react";
import { todayIso } from "../lib/date";

interface DateSelectFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
}

interface MonthSelectFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
}

function currentYear(): number {
  return Number(todayIso().slice(0, 4));
}

function yearsAround(value: string): number[] {
  const selectedYear = Number(value.slice(0, 4)) || currentYear();
  const maxYear = Math.max(currentYear() + 1, selectedYear + 1);
  const minYear = Math.min(2020, selectedYear - 1);
  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index);
}

function partsFromDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const fallback = todayIso().split("-").map(Number);
  return {
    year: year || fallback[0],
    month: month || fallback[1],
    day: day || fallback[2],
  };
}

function partsFromMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const fallback = todayIso().split("-").map(Number);
  return {
    year: year || fallback[0],
    month: month || fallback[1],
  };
}

function dateValue(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${value}T12:00:00`));
}

const months = Array.from({ length: 12 }, (_, index) => index + 1);
const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function DateSelectField({ label, value, onChange }: DateSelectFieldProps) {
  const { year, month, day } = partsFromDate(value);
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [calendarYear, setCalendarYear] = useState(year);
  const [calendarMonth, setCalendarMonth] = useState(month);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedDate = dateValue(year, month, day);
  const today = todayIso();
  const firstWeekday = (new Date(calendarYear, calendarMonth - 1, 1).getDay() + 6) % 7;
  const daysInCalendarMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInCalendarMonth) / 7) * 7;
  const calendarDays = Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(calendarYear, calendarMonth - 1, index - firstWeekday + 1);
    const isoDate = dateValue(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return {
      date,
      isoDate,
      inMonth: date.getFullYear() === calendarYear && date.getMonth() === calendarMonth - 1,
    };
  });

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function moveMonth(offset: number) {
    const next = new Date(calendarYear, calendarMonth - 1 + offset, 1);
    setCalendarYear(next.getFullYear());
    setCalendarMonth(next.getMonth() + 1);
  }

  function chooseDate(nextDate: string) {
    onChange(nextDate);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openCalendar() {
    if (open) {
      setOpen(false);
      return;
    }
    setCalendarYear(year);
    setCalendarMonth(month);
    const triggerBounds = triggerRef.current?.getBoundingClientRect();
    const bottomInset = window.matchMedia("(max-width: 720px)").matches ? 86 : 12;
    const spaceBelow = triggerBounds ? window.innerHeight - triggerBounds.bottom - bottomInset : 0;
    setOpenAbove(Boolean(triggerBounds && spaceBelow < 370 && triggerBounds.top > 370));
    setOpen(true);
  }

  return (
    <fieldset className="date-select-field">
      <legend>{label}</legend>
      <div className="date-calendar" ref={rootRef}>
        <button
          ref={triggerRef}
          className="date-calendar-trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${label}：${displayDate(selectedDate)}`}
          onClick={openCalendar}
        >
          {displayDate(selectedDate)}
        </button>
        {open && (
          <div className={`calendar-popover${openAbove ? " above" : ""}`} role="dialog" aria-label={`${label}日历`}>
            <div className="calendar-header">
              <button type="button" aria-label="上个月" onClick={() => moveMonth(-1)}>‹</button>
              <strong>{calendarYear} 年 {calendarMonth} 月</strong>
              <button type="button" aria-label="下个月" onClick={() => moveMonth(1)}>›</button>
            </div>
            <div className="calendar-weekdays" aria-hidden="true">
              {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
            </div>
            <div className="calendar-days">
              {calendarDays.map(({ date, isoDate, inMonth }) => {
                const selected = isoDate === selectedDate;
                const isToday = isoDate === today;
                const weekday = weekdays[(date.getDay() + 6) % 7];
                return (
                  <button
                    key={isoDate}
                    type="button"
                    className={`calendar-day${inMonth ? "" : " outside-month"}${selected ? " selected" : ""}${isToday ? " today" : ""}`}
                    aria-label={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`}
                    aria-pressed={selected}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => chooseDate(isoDate)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="calendar-footer">
              <button type="button" onClick={() => chooseDate(today)}>今天</button>
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
}

export function MonthSelectField({ label, value, onChange }: MonthSelectFieldProps) {
  const { year, month } = partsFromMonth(value);

  return (
    <fieldset className="date-select-field month-picker">
      <legend>{label}</legend>
      <div className="date-select-grid two-parts">
        <select aria-label={`${label} 年`} value={year} onChange={(event) => onChange(monthValue(Number(event.target.value), month))}>
          {yearsAround(value).map((item) => (
            <option key={item} value={item}>{item} 年</option>
          ))}
        </select>
        <select aria-label={`${label} 月`} value={month} onChange={(event) => onChange(monthValue(year, Number(event.target.value)))}>
          {months.map((item) => (
            <option key={item} value={item}>{item} 月</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
