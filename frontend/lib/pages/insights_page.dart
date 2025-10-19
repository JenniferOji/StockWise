import 'package:flutter/material.dart';
import 'package:frontend/pages/news_page.dart';

class InsightsPage extends StatelessWidget {
  const InsightsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          'Insights Page',
          style: TextStyle(fontSize: 24),
        ),
      ),
    );
  }
}
