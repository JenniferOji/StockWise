import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, LayoutAnimation, ScrollView, useWindowDimensions } from "react-native";
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NAV_HEIGHT } from '@/constants/layout';

import StockAllocationWidget from '@/components/StockAllocationWidget';
import RiskInsightsWidget from '@/components/RiskInsightsWidget';
import PerformanceMetricsWidget from '@/components/PerformanceMetricsWidget';
import DiversificationWidget from '@/components/DiversificationWidget';

// accordion tutorial i used: https://sanjanahumanintech.medium.com/accordion-in-react-native-95586a738aee

type MenuSection = {
        title: string;
        subtitle: string;
        icon: keyof typeof Icon.glyphMap;
};

// list of all the sections that will show up on the insights page
const menu: MenuSection[] = [
  { 
    title: "Performance Analysis",
    subtitle: "Track returns, gains and portfolio performance",
    icon: "show-chart",
  }, 
  { 
    title: "Risk Metrics",
    subtitle: "Understand volatility, drawdowns and risk profile",
    icon: "warning-amber",
  },
  { 
    title: "Stock Allocation",
    subtitle: "View sector exposure and portfolio composition",
    icon: "pie-chart-outline",
  },
  { 
    title: "Diversification Suggestions",
    subtitle: "Discover ideas to improve balance across holdings",
    icon: "auto-graph",
  },
];

// props for each accordion section
interface AccordianProps {
    title: string;
    subtitle: string;
    icon: keyof typeof Icon.glyphMap;
    expanded: boolean;
    onToggle: () => void;
    isLargeScreen: boolean;
}

// accordion component - the collapsible sections you click on
function Accordian({ title, subtitle, icon, expanded, onToggle, isLargeScreen }: AccordianProps) {
    return (
        <View style={[styles.accordionContainer, isLargeScreen && styles.accordionContainerLarge]}>
            <TouchableOpacity style={styles.row} onPress={onToggle} activeOpacity={0.85}>
                <View style={styles.rowLeft}>
                    <View style={[styles.iconWrap, expanded && styles.iconWrapActive]}>
                        <Icon
                            name={icon}
                            size={20}
                            color={expanded ? '#0b3d91' : '#64748b'}
                        />
                    </View>
                    <View style={styles.textWrap}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </View>
                </View>
                <View style={[styles.chevronWrap, expanded && styles.chevronWrapActive]}>
                    <Icon
                        name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={24}
                        color={expanded ? '#0b3d91' : '#666'}
                    />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.parentHr} />
            )}
            {expanded && (
                <View style={styles.content}>
                    {title === 'Performance Analysis' && <PerformanceMetricsWidget />}
                    {title === 'Risk Metrics' && <RiskInsightsWidget />}
                    {title === 'Stock Allocation' && <StockAllocationWidget />}
                    {title === 'Diversification Suggestions' && <DiversificationWidget />}
                </View>
            )}
        </View>
    );
}

// main insights screen component
export default function InsightsScreen() {
    const [expandedTitle, setExpandedTitle] = useState<string | null>('Performance Analysis');
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 900;

    const toggleSection = (title: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedTitle((prev) => (prev === title ? null : title));
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={[styles.pageShell, isLargeScreen && styles.pageShellLarge]}>
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>Portfolio Insights</Text>
                        <Text style={styles.pageSubtitle}>
                            Explore performance, risk, allocation and diversification in one place
                        </Text>
                    </View>

                    {/* map through menu array to create accordion sections */}
                    {menu.map((section, index) => (
                        <Accordian 
                            key={index}
                            title={section.title}
                            subtitle={section.subtitle}
                            icon={section.icon}
                            expanded={expandedTitle === section.title}
                            onToggle={() => toggleSection(section.title)}
                            isLargeScreen={isLargeScreen}
                        />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb', paddingTop: NAV_HEIGHT },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 96 },
  pageShell: { width: '100%', alignSelf: 'center' },
  pageShellLarge: { maxWidth: 1120, alignSelf: 'center' },
  pageHeader: { paddingHorizontal: 6, marginBottom: 14 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 6, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  accordionContainer: { backgroundColor: '#ffffff', borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e7edf5', elevation: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18 },
  accordionContainerLarge: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 18, backgroundColor: '#ffffff', borderRadius: 18, minHeight: 82 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconWrapActive: { backgroundColor: '#dbeafe' },
  textWrap: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  chevronWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  chevronWrapActive: { backgroundColor: '#dbeafe' },
  parentHr: { height: 1, backgroundColor: '#e9eef5', width: '100%' },
  content: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  childRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16 },
  childHr: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },
  itemText: { fontSize: 14, color: '#333', flex: 1 },
  itemTextActive: { fontSize: 14, color: '#3b82f6', fontWeight: '600', flex: 1 },
});