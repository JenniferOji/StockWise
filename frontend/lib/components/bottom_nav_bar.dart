import 'package:flutter/material.dart';
import 'package:google_nav_bar/google_nav_bar.dart';

// HomePage is the main page of the app after login/signup - where the users will input their stock data and view portfolio
class BottomNavBar extends StatelessWidget {
  void Function(int)? onTabChange;
  BottomNavBar({super.key, required this.onTabChange});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20),
      // this creates the bottom navigation bar 
      child: GNav(
        color: Colors.blue[900], // for the unselected icon 
        activeColor: Colors.blue[500], // for the selected icon
        tabActiveBorder: Border.all(color: Colors.blue.shade300), // border color when selected
        tabBackgroundColor: Colors.blue.shade100, // background color when selected,
        mainAxisAlignment: MainAxisAlignment.center,
        tabBorderRadius: 30,
        onTabChange: (value) => onTabChange!(value),
        tabs: const [
          // importing home and profile icons from google icons
          GButton(
            icon: Icons.newspaper,
            text: 'News',
          ), 
          GButton(
            icon: Icons.home,
            text: 'Home',
          ),
          GButton(
            icon: Icons.insights,
            text: 'Inisghts',
          ),
        ]
      ),
    );
  }
}