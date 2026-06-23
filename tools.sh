#!/bin/bash
strings public/bob.fbx > strings.txt
grep -i "head" strings.txt | head -n 10
grep -i "eye" strings.txt | head -n 10
grep -i "blink" strings.txt | head -n 10
