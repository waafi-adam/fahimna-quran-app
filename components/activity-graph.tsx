import { useState, useMemo } from 'react';
import { View, Text, Pressable, I18nManager } from 'react-native';
import { getDailyStatsRange, type DailyStats } from '@/lib/review-store';
import { useTheme, type Colors } from '@/lib/theme';

type Range = 'week' | 'month' | 'year';
type Metric = 'all' | 'reviewed' | 'promoted' | 'mastered';

const RANGES: { key: Range; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const METRICS: { key: Metric; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'promoted', label: 'To Learn' },
  { key: 'mastered', label: 'To Known' },
];

type Bucket = {
  key: string;
  label: string;
  /** True if this bucket contains today's date (rightmost for week/month/year) */
  isToday: boolean;
  reviewed: number;
  promoted: number;
  mastered: number;
};

function bucketLabel(date: Date, range: Range): string {
  if (range === 'year') {
    return date.toLocaleDateString('en-US', { month: 'short' });
  }
  if (range === 'month') {
    return String(date.getDate());
  }
  return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function buildBuckets(range: Range): Bucket[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (range === 'year') {
    // 12 monthly buckets, oldest (left) → current month (right)
    const buckets: Bucket[] = [];
    const cursor = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (let i = 0; i < 12; i++) {
      const start = new Date(cursor);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      const days = getDailyStatsRange(start, end);
      const sum = days.reduce<Omit<Bucket, 'key' | 'label' | 'isToday'>>(
        (acc, d) => ({
          reviewed: acc.reviewed + d.reviewed,
          promoted: acc.promoted + d.promoted,
          mastered: acc.mastered + d.mastered,
        }),
        { reviewed: 0, promoted: 0, mastered: 0 },
      );
      buckets.push({
        key: `${start.getFullYear()}-${start.getMonth()}`,
        label: bucketLabel(start, 'year'),
        isToday: isSameMonth(start, now),
        ...sum,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  // Week (7) / Month (30): oldest (left) → today (right)
  const days = range === 'week' ? 7 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  const raw = getDailyStatsRange(from, now);
  return raw.map<Bucket>((d) => {
    const date = new Date(d.date);
    return {
      key: d.date,
      label: bucketLabel(date, range),
      isToday: isSameDay(date, now),
      reviewed: d.reviewed,
      promoted: d.promoted,
      mastered: d.mastered,
    };
  });
}

function getMetricValue(b: Bucket, metric: Metric): number {
  if (metric === 'all') return b.reviewed + b.promoted + b.mastered;
  return b[metric];
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  colors,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  colors: Colors;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      padding: 3,
      borderRadius: 10,
      borderCurve: 'continuous',
      backgroundColor: colors.bgSecondary,
    }}>
      {options.map((opt) => {
        const isActive = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              flex: 1,
              paddingVertical: 7,
              alignItems: 'center',
              borderRadius: 8,
              backgroundColor: isActive ? colors.bg : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? colors.text : colors.textMuted,
            }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ActivityGraph() {
  const { colors } = useTheme();
  const [range, setRange] = useState<Range>('week');
  const [metric, setMetric] = useState<Metric>('all');
  const [focused, setFocused] = useState<string | null>(null);

  const buckets = useMemo(() => buildBuckets(range), [range]);

  const maxValue = useMemo(() => {
    let m = 0;
    for (const b of buckets) {
      const v = getMetricValue(b, metric);
      if (v > m) m = v;
    }
    return m;
  }, [buckets, metric]);

  const chartHeight = 140;
  const focusedBucket = focused ? buckets.find((b) => b.key === focused) : null;

  const reviewedColor = colors.accent;
  const promotedColor = colors.progressLearning;
  const masteredColor = colors.progressKnown;

  // Force LTR regardless of device locale so oldest is always on the left
  const forceLTR = I18nManager.isRTL ? { direction: 'ltr' as const } : null;

  return (
    <View style={{ gap: 12 }}>
      <Segmented options={RANGES} value={range} onChange={setRange} colors={colors} />
      <Segmented options={METRICS} value={metric} onChange={setMetric} colors={colors} />

      {/* Chart */}
      <View style={[{
        padding: 12,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: colors.bgSecondary,
      }, forceLTR]}>
        {/* Axis hint — chronological order is unambiguous */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 6,
          paddingHorizontal: 2,
        }}>
          <Text style={{ fontSize: 9, color: colors.textFaint, letterSpacing: 0.4 }}>
            OLDEST
          </Text>
          <Text style={{ fontSize: 9, color: colors.textFaint, letterSpacing: 0.4 }}>
            TODAY →
          </Text>
        </View>

        <View style={{
          height: chartHeight,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: range === 'month' ? 2 : 6,
        }}>
          {buckets.map((b) => {
            const total = getMetricValue(b, metric);
            const ratio = maxValue > 0 ? total / maxValue : 0;
            const barHeight = Math.max(ratio * chartHeight, total > 0 ? 2 : 0);

            // Stacked segments when metric is 'all'
            let segments: { color: string; height: number }[] = [];
            if (metric === 'all' && total > 0) {
              segments = [
                { color: reviewedColor, height: (b.reviewed / total) * barHeight },
                { color: promotedColor, height: (b.promoted / total) * barHeight },
                { color: masteredColor, height: (b.mastered / total) * barHeight },
              ];
            } else {
              const color =
                metric === 'reviewed' ? reviewedColor :
                metric === 'promoted' ? promotedColor :
                metric === 'mastered' ? masteredColor :
                reviewedColor;
              segments = [{ color, height: barHeight }];
            }

            const isFocused = focused === b.key;

            return (
              <Pressable
                key={b.key}
                onPress={() => setFocused(isFocused ? null : b.key)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartHeight }}
              >
                <View
                  style={{
                    width: '100%',
                    height: barHeight,
                    borderRadius: 3,
                    overflow: 'hidden',
                    flexDirection: 'column-reverse',
                    opacity: focused && !isFocused ? 0.4 : 1,
                    borderWidth: isFocused ? 1 : b.isToday ? 1.5 : 0,
                    borderColor: isFocused ? colors.text : b.isToday ? colors.accent : 'transparent',
                  }}
                >
                  {segments.map((seg, i) => (
                    <View
                      key={i}
                      style={{ height: seg.height, backgroundColor: seg.color }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Bucket labels + "Today" marker below the rightmost bar */}
        <View style={{
          flexDirection: 'row',
          marginTop: 8,
          gap: range === 'month' ? 2 : 6,
        }}>
          {buckets.map((b, i) => {
            const show = range !== 'month' || i === 0 || i === buckets.length - 1 || (i + 1) % 5 === 0;
            return (
              <View key={b.key} style={{ flex: 1, alignItems: 'center' }}>
                {b.isToday ? (
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent, letterSpacing: 0.3 }}>
                    TODAY
                  </Text>
                ) : show ? (
                  <Text style={{ fontSize: 10, color: colors.textFaint, fontVariant: ['tabular-nums'] }}>
                    {b.label}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Focused tooltip */}
        {focusedBucket && (
          <View style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            borderCurve: 'continuous',
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4 }}>
              {focusedBucket.key}{focusedBucket.isToday ? ' · Today' : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Text style={{ fontSize: 12, color: colors.text }}>
                <Text style={{ fontWeight: '700' }}>{focusedBucket.reviewed}</Text>
                <Text style={{ color: colors.textMuted }}> reviewed</Text>
              </Text>
              <Text style={{ fontSize: 12, color: colors.text }}>
                <Text style={{ fontWeight: '700' }}>{focusedBucket.promoted}</Text>
                <Text style={{ color: colors.textMuted }}> to learn</Text>
              </Text>
              <Text style={{ fontSize: 12, color: colors.text }}>
                <Text style={{ fontWeight: '700' }}>{focusedBucket.mastered}</Text>
                <Text style={{ color: colors.textMuted }}> to known</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Legend (only for 'all' metric) */}
        {metric === 'all' && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: reviewedColor }} />
              <Text style={{ fontSize: 10, color: colors.textMuted }}>Reviewed</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: promotedColor }} />
              <Text style={{ fontSize: 10, color: colors.textMuted }}>To Learn</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: masteredColor }} />
              <Text style={{ fontSize: 10, color: colors.textMuted }}>To Known</Text>
            </View>
          </View>
        )}

        {maxValue === 0 && (
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>
            No activity yet in this range
          </Text>
        )}
      </View>
    </View>
  );
}
