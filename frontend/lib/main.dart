import 'package:flutter/material.dart';
import 'package:frontend/pages/intro_page.dart';
import 'package:frontend/pages/home_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // everything in flutter is a widget 
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      // this is the page the app starts on
      home: IntroPage(),
      routes: {
        '/intro': (context) => HomePage(),
      },
    );
  }
}