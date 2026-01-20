import React, { useState } from 'react';
import { View, TouchableOpacity, Text, FlatList, StyleSheet, LayoutAnimation, ScrollView} from "react-native";
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NAV_HEIGHT } from '@/constants/layout';

// https://sanjanahumanintech.medium.com/accordion-in-react-native-95586a738aee

// dummy data
const menu = [
  { 
    title: "Sizzler",
    data: [
      {key: "Paneer Sizzler", value: false}, 
      {key: "Italian Sizzler", value: false}
    ]
  },
  { 
    title: "Pizza",
    data: [
      {key: "FarmHarvest Pizza", value: false}, 
      {key: "Veg Extravegneza", value: false}
    ]
  }, 
  { 
    title: "Garlic Bread",
    data: [
      {key: "Herbs Garlic Bread", value: false}, 
      {key: "Extra cheese Garlic Bread", value: false}
    ]
  },
];

interface AccordianProps {
    title: string;
    data: Array<{key: string; value: boolean}>;
}

function Accordian({ title, data: initialData }: AccordianProps) {
    const [data, setData] = useState(initialData);
    const [expanded, setExpanded] = useState(false);

    const onClick = (index: number) => {
        const temp = data.slice();
        temp[index].value = !temp[index].value;
        setData(temp);
    };

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
            {
                expanded &&
                <View>
                    <FlatList
                        data={data}
                        numColumns={1}
                        scrollEnabled={false}
                        renderItem={({item, index}) => 
                            <View key={index}>
                                <TouchableOpacity 
                                    style={styles.childRow} 
                                    onPress={() => onClick(index)}
                                >
                                    <Text style={item.value ? styles.itemTextActive : styles.itemText}>
                                        {item.key}
                                    </Text>
                                    <Icon 
                                        name={item.value ? 'check-circle' : 'radio-button-unchecked'} 
                                        size={22} 
                                        color={item.value ? '#3b82f6' : '#d1d5db'} 
                                    />
                                </TouchableOpacity>
                                {index < data.length - 1 && <View style={styles.childHr}/>}
                            </View>
                        }
                    />
                </View>
            }
        </View>
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

// Main component that uses the Accordian
export default function InsightsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {menu.map((section, index) => (
                    <Accordian 
                        key={index}
                        title={section.title} 
                        data={section.data} 
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}