import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, LayoutAnimation, ScrollView} from "react-native";
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NAV_HEIGHT } from '@/constants/layout';

import PortfolioInsightsWidget from '@/components/PortfolioInsightsWidget';
import RiskInsightsWidget from '@/components/RiskInsightsWidget';

// accordion tutorial i used: https://sanjanahumanintech.medium.com/accordion-in-react-native-95586a738aee

// list of all the sections that will show up on the insights page
const menu = [
  { 
    title: "Risk Metrics",
  },
  { 
    title: "Performance Analysis",
  }, 
  { 
    title: "Stock Allocation",
  },
  { 
    title: "Diverification Suggestions",
  },

];

// props for each accordion section
interface AccordianProps {
    title: string;
    // isWidget?: boolean;
}

// accordion component - the collapsible sections you click on
function Accordian({ title }: AccordianProps) {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.accordionContainer}>
            <TouchableOpacity style={styles.row} onPress={toggleExpand}>
                <Text style={styles.title}>{title}</Text>
                <Icon name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={'#666'} />
            </TouchableOpacity>
            <View style={styles.parentHr}/>
            {/* Show RiskInsightsWidget for Risk Metrics, PortfolioInsightsWidget for Stock Allocation */}
            {expanded && title === 'Risk Metrics' && <RiskInsightsWidget />}
            {expanded && title == 'Stock Allocation' && <PortfolioInsightsWidget />}
        </View>
    );
}

// main insights screen component
export default function InsightsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* map through menu array to create accordion sections */}
                {menu.map((section, index) => (
                    <Accordian 
                        key={index}
                        title={section.title} 
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f5f7fa', 
        paddingTop: NAV_HEIGHT 
    },
    scrollContainer:{
        flexGrow: 1,
        padding: 12,
        paddingBottom: 96,
    },
    accordionContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    row:{
        flexDirection: 'row',
        justifyContent:'space-between',
        height: 56,
        paddingLeft: 16,
        paddingRight: 16,
        alignItems:'center',
        backgroundColor: '#fff',
    },
    title:{
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    parentHr:{
        height: 1,
        backgroundColor: '#e5e7eb',
        width:'100%'
    },
    childRow:{
        flexDirection: 'row',
        justifyContent:'space-between',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    childHr:{
        height: 1,
        backgroundColor: '#f3f4f6',
        marginLeft: 16,
    },
    itemText:{
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    itemTextActive:{
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
        flex: 1,
    },
});
