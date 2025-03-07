import 'package:flutter/material.dart';

class TextBlock extends StatelessWidget {
  final String text;

  const TextBlock({
    Key? key,
    required this.text,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        text,
        style: const TextStyle(color: Colors.white),
        textAlign: TextAlign.center,
      ),
    );
  }
}
