import 'package:flutter/material.dart';
import 'package:google_nav_bar/google_nav_bar.dart';

// HomePage is the main page of the app after login/signup - where the users will input their stock data and view portfolio
class BottomNavBar extends StatelessWidget {
  const BottomNavBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      // this creates the bottom navigation bar 
      child: GNav(
        color: Colors.blue[900], // for the unselected icon 
        activeColor: Colors.blue[300], // for the selected icon
        tabActiveBorder: Border.all(color: Colors.blue.shade100), // border color when selected
        tabBackgroundColor: Colors.blue.shade50, // background color when selected,
        mainAxisAlignment: MainAxisAlignment.center,
        tabs: const [
          // importing home and profile icons from google icons 
          GButton(
            icon: Icons.home,
            text: 'Home',
          ),
          GButton(
            icon: Icons.person,
            text: 'Profile',
          ),
        ]
      ),
    );
  }
}