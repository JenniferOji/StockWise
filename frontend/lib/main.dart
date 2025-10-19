import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  void userTapped() {
    print("The user tapped the screen");
  }

  // everything in flutter is a widget 
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      // this is the page the app starts on
      home: Scaffold(
        body: Center(
          child: GestureDetector(
            onTap: userTapped,
            child: Container(
              width: 200,
              height: 200,
              color: Colors.deepPurple[200],
              child: Center(child:  Text("tap me"),)
            ),
          ),
        ),
      ),
    );
  }
}