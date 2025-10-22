import 'package:flutter/material.dart';
import 'package:frontend/components/bottom_nav_bar.dart';
import 'package:frontend/pages/insights_page.dart';
import 'package:frontend/pages/news_page.dart';

// HomePage is the main page of the app after login/signup - where the users will input their stock data and view portfolio
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // this selected index is to control the bottom navigation bar
  int _selectedIndex = 0;

  // this method updates the slected index when the user taps on the bottom bar 
  void navigateBottomBar(int index){
    setState(() {
      _selectedIndex = index;
    });
  }

  // pages to navigate between 
  final List<Widget> _pages = [
    const NewsPage(),

    // home placeholder 
    Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.home, size: 48, color: Colors.blue),
          SizedBox(height: 8),
          Text('Home', style: TextStyle(fontSize: 20)),
        ],
      ),
    ),

    const InsightsPage(), 
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // this adds the bottom navigation bar component
      bottomNavigationBar: BottomNavBar(
        onTabChange: (index) => navigateBottomBar(index),
      ),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.menu),
            color: Colors.black,
          onPressed: () {},
          ),
      ),
      // have to pass it to the body for the index to show the correct page
      body: _pages[_selectedIndex],
    );
  }
}