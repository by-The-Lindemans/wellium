import 'package:flutter/material.dart';

import 'progress_bar.dart';  // Make sure this import path is correct

class LabeledProgressBar extends StatelessWidget {
  final int numerator;
  final int denominator;
  final double height;

  const LabeledProgressBar({
    Key? key,
    required this.numerator,
    required this.denominator,
    this.height = 20.0,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final containerWidth = constraints.maxWidth;
        
        // Scale all measurements based on container width
        final horizontalPadding = containerWidth * 0.06; // ~24px on normal screen
        final textSize = containerWidth * 0.04;
        final spacingHeight = containerWidth * 0.02; // ~8px on normal screen
        final smallSpacingHeight = containerWidth * 0.01; // ~4px on normal screen
        final progressHeight = containerWidth * 0.05; // ~20px on normal screen
        final borderWidth = containerWidth * 0.005; // ~2px on normal screen
        final borderRadius = progressHeight / 2 + borderWidth;
        
        final double percent =
            denominator == 0 ? 0 : (numerator / denominator) * 100;
        
        return Container(
          padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${percent.toInt()}%',
                style: TextStyle(color: Colors.white, fontSize: textSize),
              ),
              SizedBox(height: spacingHeight),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white, width: borderWidth),
                  borderRadius: BorderRadius.circular(borderRadius),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(borderRadius - (borderWidth/2)),
                  child: ProgressBar(
                    percent: percent,
                    height: progressHeight,
                    backgroundColor: Colors.white,
                    progressColor: Colors.blue,
                  ),
                ),
              ),
              SizedBox(height: smallSpacingHeight),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('0', style: TextStyle(color: Colors.white, fontSize: textSize * 0.8)),
                  Text('$denominator', style: TextStyle(color: Colors.white, fontSize: textSize * 0.8)),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
