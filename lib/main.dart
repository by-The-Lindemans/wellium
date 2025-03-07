import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'data/db_connection.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Hive.initFlutter();
  await DbConnection.instance.init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'welliuᴍ',
      theme: ThemeData.dark().copyWith(
        textTheme: GoogleFonts.notoSansTextTheme(
          ThemeData.dark().textTheme,
        ).apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ),
        appBarTheme: const AppBarTheme(
          titleTextStyle: TextStyle(
            fontFamily: 'CodeNewRoman',
            // Apply Code New Roman for the AppBar title
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        primaryColor: Colors.blue,
        scaffoldBackgroundColor:
            const Color(0xFF7F7F7F), // background-color from CSS
      ),
      home: HomeScreen(),
    );
  }
}
