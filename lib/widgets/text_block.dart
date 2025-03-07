import 'package:flutter/material.dart';

class TextBlock extends StatelessWidget {
  final String text;

  const TextBlock({Key? key, required this.text}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: TextAlign.center,
      style: const TextStyle(
        fontFamily: 'CodeNewRoman',
        // Reference the font declared in pubspec.yaml
        fontSize: 18,
        color: Colors.white,
      ),
    );
  }
}
