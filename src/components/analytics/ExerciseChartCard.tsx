import React, { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, radii, spacing, typography } from '../../theme';
import type { ExerciseChartMetric, ExerciseSessionStats } from '../../types';
import { formatDayMonthNumeric, hapticLight } from '../../utils';
import { Card } from '../common';

interface ExerciseChartCardProps {
  sessions: ExerciseSessionStats[];
  metric: ExerciseChartMetric;
  onChangeMetric: (metric: ExerciseChartMetric) => void;
}

const METRIC_OPTIONS: Array<{
  key: ExerciseChartMetric;
  label: string;
  unit: string;
  color: string;
}> = [
  { key: 'estimated1rm', label: '1RM Est.', unit: 'kg', color: colors.primary },
  { key: 'maxWeight', label: 'Carga Máx.', unit: 'kg', color: colors.secondary },
  { key: 'totalVolume', label: 'Volume', unit: 'kg', color: colors.info },
];

export function ExerciseChartCard({
  sessions,
  metric,
  onChangeMetric,
}: ExerciseChartCardProps): React.JSX.Element {
  const activeOption =
    METRIC_OPTIONS.find((m) => m.key === metric) ?? METRIC_OPTIONS[0]!;

  const chartData = useMemo(() => {
    return sessions.map((s) => {
      const value =
        metric === 'estimated1rm'
          ? s.bestEstimated1rm
          : metric === 'maxWeight'
          ? s.maxEffectiveWeight
          : s.totalVolume;

      return {
        value: Number(value.toFixed(1)),
        label: formatDayMonthNumeric(s.performedAt),
        dataPointText:
          metric === 'totalVolume' ? `${Math.round(value)}` : `${value.toFixed(1)}`,
      };
    });
  }, [sessions, metric]);

  const maxVal = chartData.reduce((m, d) => (d.value > m ? d.value : m), 10);
  const chartWidth = Math.max(240, Dimensions.get('window').width - 104);
  const spacingPx =
    chartData.length > 1
      ? Math.max(46, Math.floor((chartWidth - 30) / (chartData.length - 1)))
      : 60;

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Evolução Histórica</Text>
        <Text style={styles.subtitle}>
          {sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'} registradas
        </Text>
      </View>

      <View style={styles.switcher}>
        {METRIC_OPTIONS.map((opt) => {
          const selected = opt.key === metric;
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                void hapticLight();
                onChangeMetric(opt.key);
              }}
              style={[
                styles.switchBtn,
                selected && { backgroundColor: opt.color },
              ]}
            >
              <Text
                style={[
                  styles.switchLabel,
                  selected && styles.switchLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {chartData.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Sem sessões concluídas para plotar o gráfico ainda.
          </Text>
        </View>
      ) : (
        <View style={styles.chartWrap}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={190}
            spacing={spacingPx}
            initialSpacing={18}
            endSpacing={18}
            color={activeOption.color}
            thickness={3}
            areaChart
            curved
            startFillColor={activeOption.color}
            endFillColor={colors.surface}
            startOpacity={0.28}
            endOpacity={0.02}
            dataPointsColor={activeOption.color}
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
            maxValue={Math.ceil(maxVal * 1.15)}
            hideYAxisText={false}
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
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.subtitle,
  },
  subtitle: {
    ...typography.caption,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
    marginBottom: spacing.lg,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  switchLabelActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  chartWrap: {
    paddingTop: spacing.xs,
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
    textAlign: 'center',
  },
});
