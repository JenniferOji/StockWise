import 'package:flutter/material.dart';
import 'package:frontend/pages/insights_page.dart';

class NewsPage extends StatelessWidget {
  const NewsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          'News Page',
          style: TextStyle(fontSize: 24),
        ),
      ),
    );
  }
}