import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, spacing, typography } from '../../theme';
import type { BodyMeasurement, BodyMetricKey } from '../../types';
import { formatDayMonthNumeric, round2 } from '../../utils';
import { Badge, Card, Chip } from '../common';

interface BodyTrendChartCardProps {
  measurements: BodyMeasurement[];
  selectedMetric: BodyMetricKey;
  onSelectMetric: (key: BodyMetricKey) => void;
}

const BODY_METRICS: Array<{ key: BodyMetricKey; label: string; unit: string }> = [
  { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'bodyFatPct', label: '% Gordura', unit: '%' },
  { key: 'armCm', label: 'Braço', unit: 'cm' },
  { key: 'chestCm', label: 'Peito', unit: 'cm' },
  { key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { key: 'thighCm', label: 'Coxa', unit: 'cm' },
];

export function BodyTrendChartCard({
  measurements,
  selectedMetric,
  onSelectMetric,
}: BodyTrendChartCardProps): React.JSX.Element {
  const metricInfo =
    BODY_METRICS.find((m) => m.key === selectedMetric) ?? BODY_METRICS[0]!;

  const points = useMemo(() => {
    const asc = [...measurements].reverse();
    return asc
      .map((item) => {
        const val = item[selectedMetric];
        if (val === null || val === undefined) return null;
        return {
          value: val,
          label: formatDayMonthNumeric(item.measuredAt),
          dataPointText: `${val}`,
        };
      })
      .filter((p): p is { value: number; label: string; dataPointText: string } => p !== null);
  }, [measurements, selectedMetric]);

  const firstVal = points[0]?.value ?? null;
  const lastVal = points[points.length - 1]?.value ?? null;
  const delta =
    firstVal !== null && lastVal !== null && points.length >= 2
      ? round2(lastVal - firstVal)
      : null;

  const chartWidth = Math.max(240, Dimensions.get('window').width - 104);
  const spacingPx =
    points.length > 1
      ? Math.max(50, Math.floor((chartWidth - 30) / (points.length - 1)))
      : 60;

  const minVal = points.reduce((m, p) => (p.value < m ? p.value : m), points[0]?.value ?? 0);
  const maxVal = points.reduce((m, p) => (p.value > m ? p.value : m), points[0]?.value ?? 10);
  const yOffset = Math.max(0, Math.floor(minVal - Math.max(1, (maxVal - minVal) * 0.4)));

  return (
    <Card>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tendência Corporal</Text>
          <Text style={styles.subtitle}>
            {metricInfo.label} ({metricInfo.unit})
          </Text>
        </View>
        {delta !== null ? (
          <Badge
            label={`${delta >= 0 ? '+' : ''}${delta} ${metricInfo.unit}`}
            tone={
              selectedMetric === 'waistCm' || selectedMetric === 'bodyFatPct'
                ? delta <= 0
                  ? 'success'
                  : 'warning'
                : delta >= 0
                ? 'success'
                : 'warning'
            }
          />
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
      >
        {BODY_METRICS.map((m) => (
          <Chip
            key={m.key}
            label={m.label}
            selected={selectedMetric === m.key}
            onPress={() => onSelectMetric(m.key)}
            accentColor={colors.secondary}
          />
        ))}
      </ScrollView>

      {points.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Nenhum registro de {metricInfo.label.toLowerCase()} ainda.
          </Text>
        </View>
      ) : (
        <View style={styles.chartWrap}>
          <LineChart
            data={points}
            width={chartWidth}
            height={175}
            spacing={spacingPx}
            initialSpacing={18}
            endSpacing={18}
            color={colors.secondary}
            thickness={3}
            areaChart
            curved
            startFillColor={colors.secondary}
            endFillColor={colors.surface}
            startOpacity={0.25}
            endOpacity={0.02}
            dataPointsColor={colors.secondary}
            dataPointsRadius={5}
            textColor={colors.textSecondary}
            textFontSize={10}
            textShiftY={-8}
            textShiftX={-6}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.borderSubtle}
            rulesType="dashed"
            noOfSections={4}
            yAxisOffset={yOffset}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  chips: {
    marginBottom: spacing.md,
  },
  chartWrap: {
    overflow: 'hidden',
  },
  axisText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  emptyBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
  },
});
