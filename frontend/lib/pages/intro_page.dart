import 'package:flutter/material.dart';
import 'package:frontend/pages/home_page.dart';

// IntroPage is the first page the user sees when they open the app - contsins login in / sign up 
class IntroPage extends StatelessWidget {
  const IntroPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue[50],
      body: Center(
        child: Padding(
          // adding paddign to the sides of the app 
          padding: const EdgeInsets.symmetric(horizontal: 25.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // logo 
              Padding(
                padding: const EdgeInsets.all(25.0),
                child: Image.asset(
                  'lib/images/logo.png',
                  height: 200,
                  width: 200,
                ),
              ),
          
              const SizedBox(height: 20), // blank space 
          
              //title
              Text(
                'Stock Wise',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[900],
                  )
                ),
              
              const SizedBox(height: 20), // blank space 
              // subtitle
              Text(
                'Your portfolio. Simplified',
                style: TextStyle(
                    fontSize: 18,
                    color: Colors.blue[700],
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 20), // blank space 

              // start now button - to go into main app 
              GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    // navigates to home page when this button is clicked 
                    builder:  (context) => HomePage(),
                    ),
                ),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.blue[900]
                  ),
                  padding: const EdgeInsets.all(25.0),
                  child: const Text("Optimise now", 
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}