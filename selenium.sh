#!/bin/bash
selenium_file="selenium-server-standalone-2.15.0.jar"
if [ -e "$selenium_file" ]
then
  java -jar $selenium_file
else
  wget -O selenium.tmp http://selenium.googlecode.com/files/selenium-server-standalone-2.15.0.jar
  mv selenium.tmp $selenium_file
fi

