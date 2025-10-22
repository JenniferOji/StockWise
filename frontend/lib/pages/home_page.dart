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
        leading: Builder (
          builder: (context) => IconButton(
            icon: Padding(
              padding: const EdgeInsets.only(left: 10.0),
              child: Icon(
                Icons.menu,
                color: Colors.black,
              ),
          ),
          onPressed: () {
            Scaffold.of(context).openDrawer();
          },
        ),
      ),
    ),
    // the semin page thagt opens when the menu button is clicked 
    drawer: Drawer(
      backgroundColor: Colors.blue[50],
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        // wrapping the items in another columns so that logout is on its own 
        children: [
          Column(
            children: [Column(
            children: [
              // logo 
              DrawerHeader(
                child: Image.asset(
                  'lib/images/logo.png',

                ),
              ),
              // dividing line 
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10.0),
                child: Divider(
                  color: Colors.white
                ),
              ),
              // menu options
              //profile
              Padding(
                padding: const EdgeInsets.only(left: 25.0),
                child: ListTile(
                  leading: Icon(
                    Icons.person, 
                    color: Colors.blue[900]
                  ),
                  title: Text(
                    'Profile', 
                    style: TextStyle(color: Colors.blue[900])),
                ),
              ),
              // about 
              Padding(
                padding: const EdgeInsets.only(left: 25.0),
                child: ListTile(
                  leading: Icon(
                    Icons.info, 
                    color: Colors.blue[900]
                  ),
                  title: Text(
                    'About', 
                    style: TextStyle(color: Colors.blue[900])),
                ),
              ),
              // settings 
              Padding(
                padding: const EdgeInsets.only(left: 25.0),
                child: ListTile(
                  leading: Icon(
                    Icons.settings, 
                    color: Colors.blue[900]
                  ),
                  title: Text(
                    'Settings', 
                    style: TextStyle(color: Colors.blue[900])),
                ),
              ),],
              )
            ]
          ),

          // logout at the bottom of the drawer 
          Padding(
            padding: const EdgeInsets.only(left: 25.0, bottom: 25.0),
            child: ListTile(
              leading: Icon(
                Icons.logout, 
                color: Colors.blue[900]
              ),
              title: Text(
                'Logout', 
                style: TextStyle(color: Colors.blue[900])),
            ),
          ),
        ],
      ),
    ),
    // have to pass it to the body for the index to show the correct page
    body: _pages[_selectedIndex],
    );
  }
}