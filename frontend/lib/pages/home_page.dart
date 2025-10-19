import 'package:flutter/material.dart';
import 'package:frontend/components/bottom_nav_bar.dart';

// HomePage is the main page of the app after login/signup - where the users will input their stock data and view portfolio
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue[50],
      // this adds the bottom navigation bar component
      bottomNavigationBar: BottomNavBar(),
    );
  }
}