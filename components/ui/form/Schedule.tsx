import { PlusIcon, TrashIcon } from "@heroicons/react/outline";
import dayjs, { Dayjs, ConfigType } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useCallback, useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";

import { defaultDayRange } from "@lib/availability";
import { weekdayNames } from "@lib/core/i18n/weekday";
import { useLocale } from "@lib/hooks/useLocale";
import { TimeRange } from "@lib/types/schedule";

import Button from "@components/ui/Button";
import Select from "@components/ui/form/Select";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Begin Time Increments For Select */
const increment = 15;
/**
 * Creates an array of times on a 15 minute interval from
 * 00:00:00 (Start of day) to
 * 23:45:00 (End of day with enough time for 15 min booking)
 */
const TIMES = (() => {
  const end = dayjs().endOf("day");
  let t: Dayjs = dayjs().startOf("day");

  const times = [];
  while (t.isBefore(end)) {
    times.push(t);
    t = t.add(increment, "minutes");
  }
  return times;
})();
/** End Time Increments For Select */

type Option = {
  readonly label: string;
  readonly value: number;
};

type TimeRangeFieldProps = {
  name: string;
};

const TimeRangeField = ({ name }: TimeRangeFieldProps) => {
  // Lazy-loaded options, otherwise adding a field has a noticable redraw delay.
  const [options, setOptions] = useState<Option[]>([]);
  // const { i18n } = useLocale();
  const getOption = (time: ConfigType) => ({
    value: dayjs(time).toDate().valueOf(),
    label: dayjs(time).utc().format("HH:mm"),
    // .toLocaleTimeString(i18n.language, { minute: "numeric", hour: "numeric" }),
  });

  const timeOptions = useCallback((offsetOrLimit: { offset?: number; limit?: number } = {}) => {
    const { limit, offset } = offsetOrLimit;
    return TIMES.filter((time) => (!limit || time.isBefore(limit)) && (!offset || time.isAfter(offset))).map(
      (t) => getOption(t)
    );
  }, []);

  return (
    <>
      <Controller
        name={`${name}.start`}
        render={({ field: { onChange, value } }) => (
          <Select
            className="w-[6rem]"
            options={options}
            onFocus={() => setOptions(timeOptions())}
            onBlur={() => setOptions([])}
            defaultValue={getOption(value)}
            onChange={(option) => onChange(new Date(option?.value as number))}
          />
        )}
      />
      <span>-</span>
      <Controller
        name={`${name}.end`}
        render={({ field: { onChange, value } }) => (
          <Select
            className="w-[6rem]"
            options={options}
            onFocus={() => setOptions(timeOptions())}
            onBlur={() => setOptions([])}
            defaultValue={getOption(value)}
            onChange={(option) => onChange(new Date(option?.value as number))}
          />
        )}
      />
    </>
  );
};

type ScheduleBlockProps = {
  day: number;
  weekday: string;
  name: string;
};

const ScheduleBlock = ({ name, day, weekday }: ScheduleBlockProps) => {
  const { t } = useLocale();
  const { fields, append, remove, replace } = useFieldArray({
    name: `${name}.${day}`,
  });

  const handleAppend = () => {
    // FIXME: Fix type-inference, can't get this to work. @see https://github.com/react-hook-form/react-hook-form/issues/4499
    const nextRangeStart = dayjs((fields[fields.length - 1] as unknown as TimeRange).end);
    const nextRangeEnd = dayjs(nextRangeStart).add(1, "hour");

    if (nextRangeEnd.isBefore(nextRangeStart.endOf("day"))) {
      return append({
        start: nextRangeStart.toDate(),
        end: nextRangeEnd.toDate(),
      });
    }
  };

  return (
    <fieldset className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row justify-between py-5 min-h-[86px]">
      <div className="w-1/3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={fields.length > 0}
            onChange={(e) => (e.target.checked ? replace([defaultDayRange]) : replace([]))}
            className="inline-block border-gray-300 rounded-sm focus:ring-neutral-500 text-neutral-900"
          />
          <span className="inline-block text-sm capitalize">{weekday}</span>
        </label>
      </div>
      <div className="flex-grow">
        {fields.map((field, index) => (
          <div key={field.id} className="flex justify-between mb-1">
            <div className="flex items-center space-x-2">
              <TimeRangeField name={`${name}.${day}.${index}`} />
            </div>
            <Button
              size="icon"
              color="minimal"
              StartIcon={TrashIcon}
              type="button"
              onClick={() => remove(index)}
            />
          </div>
        ))}
        <span className="block text-sm text-gray-500">{!fields.length && t("no_availability")}</span>
      </div>
      <div>
        <Button
          type="button"
          color="minimal"
          size="icon"
          className={fields.length > 0 ? "visible" : "invisible"}
          StartIcon={PlusIcon}
          onClick={handleAppend}
        />
      </div>
    </fieldset>
  );
};

const Schedule = ({ name }: { name: string }) => {
  const { i18n } = useLocale();
  return (
    <fieldset className="divide-y divide-gray-200">
      {weekdayNames(i18n.language).map((weekday, num) => (
        <ScheduleBlock key={num} name={name} weekday={weekday} day={num} />
      ))}
    </fieldset>
  );
};

export default Schedule;
