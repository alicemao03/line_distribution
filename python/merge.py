from clean_colored_lyrics import *
from synced_lyrics import *
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
from fuzzysearch import find_near_matches
import regex
import datetime
import pandas as pd
import math
import os
from pathlib import Path
import copy
from datetime import datetime, timedelta, date

def merge_singular(colored_lyrics, synced_lyrics, looking_ahead_max, debug):    
    c_i = 0
    s_i = 0
    m_i = 0

    # colored_lyrics_copy = copy.deepcopy(colored_lyrics[:20])
    # synced_lyrics_copy = copy.deepcopy(synced_lyrics[:20])
    
    colored_lyrics_copy = copy.deepcopy(colored_lyrics)
    synced_lyrics_copy = copy.deepcopy(synced_lyrics)

    merged_lines = copy.deepcopy(colored_lyrics_copy)
    for m in merged_lines:
        m['lyric'] = m['lyric'].strip()
        m['start'] = ''
        m['end'] = ''
        m['delta'] = 0

    unmerged_line_color = []
    unmerged_line_synced = []

    # colored_lyrics_copy = colored_lyrics.copy()
    # synced_lyrics_copy = synced_lyrics.copy()

    c_looking_ahead_index = 0
    s_looking_ahead_index = 0
    looking_ahead = []

    find_children = False
    parent = True

    c_len_shorter = True
    check_color = True

    while c_i < len(merged_lines) or s_i < len(synced_lyrics_copy):
        if debug: print('c_i',c_i, '  s_i', s_i, '  c_looking_ahead_index', c_looking_ahead_index, '    s_looking_ahead_index', s_looking_ahead_index)

        if c_i >= len(merged_lines) or c_looking_ahead_index > looking_ahead_max:
            if debug: print('MERGE REMAINING SYNCED')
            for s in synced_lyrics_copy[s_i:]:
                unmerged_line_synced.append(s)
                if debug: print('ADDING UMERGED SYNCED --->', s)
            break

        if s_i >= len(synced_lyrics_copy) or s_looking_ahead_index > looking_ahead_max:
            if debug: print('MERGE REMAINING COLOR')
            for c in merged_lines[c_i:]:
                unmerged_line_color.append(c)
                if debug: print('ADDING UMERGED COLOR --->', c)
            break


        if c_i + c_looking_ahead_index >= len(merged_lines):
            if debug: print("OVER COLOR")
            looking_ahead_max = max(0, len(merged_lines) - c_i - 1)
            if debug: print(looking_ahead_max, c_i, s_i)
            break
        elif s_i + s_looking_ahead_index >= len(synced_lyrics_copy):
            if debug: print("OVER SYNCED")
            looking_ahead_max = max(0, len(synced_lyrics_copy) - s_i - 1)
            if debug: print(looking_ahead_max, c_i, s_i)
            break

        c_line = colored_lyrics_copy[c_i + c_looking_ahead_index]
        s_line = synced_lyrics_copy[s_i + s_looking_ahead_index]
        if debug: print(c_line, s_line)
        c_lyric = c_line['lyric']
        c_lyric_norm = normalize_lyrics(c_lyric)
        s_lyric = s_line['lyric']
        s_lyric_norm = normalize_lyrics(s_lyric)
        m_line = merged_lines[c_i + c_looking_ahead_index]
        if debug: print(c_lyric_norm, s_lyric_norm)

        max_l_dist = 5
        c_len = len(c_lyric_norm)
        s_len = len(s_lyric_norm)
        if c_len < 5 or s_len < 5:
            max_l_dist = 1
        elif c_len < 10 or s_len < 10:
            max_l_dist = int(min(c_len, s_len) / 3)

        find_match = []
        remaining_match = []
        remaining_str = ''
        og_len = 0
        norm_len = 0
        if c_len <= s_len:
            c_len_shorter = True
            find_match = find_near_matches(c_lyric_norm, s_lyric_norm, max_l_dist=max_l_dist)
            # remaining_match = find_near_matches(c_lyric, s_lyric, max_l_dist=3)
            remaining_str = s_lyric_norm
            sub_len = len(s_lyric) - len(s_lyric_norm)
            if debug: print('c_len find_match: ', find_match)
        else:
            c_len_shorter = False
            find_match = find_near_matches(s_lyric_norm, c_lyric_norm, max_l_dist=max_l_dist)
            # remaining_match = find_near_matches(s_lyric, c_lyric, max_l_dist=3)
            remaining_str = c_lyric_norm
            sub_len = len(c_lyric) - len(c_lyric_norm)
            if debug: print('s_len find_match: ', find_match)

        if debug: print('found', find_match)
        found = False
        match_end = 0

        if find_match:
            found = find_match[0].start <= 3 and find_match[0].matched
            match_end = find_match[0].end
        else:
            prefix = os.path.commonprefix([c_lyric, s_lyric])
            if debug: print('PREFIX: ' ,prefix)
            if len(prefix) >= 4: 
                if debug: print('STARTS THE SAME')
                match_end = len(prefix)
                found = True
        remaining_str = remaining_str[match_end:].strip()

        if found:
            
            
            if c_len_shorter and not remaining_str:
                if m_line['start'] == '':
                    m_line['start'] = s_line['start']
                m_line['end'] = s_line['end']
                m_line['delta'] = m_line['delta'] + s_line['delta']
                if debug: print('EXACT COLOR MERGE --->', m_line)
                c_i += (1 + c_looking_ahead_index)
                s_i += 1
                m_i += 1
                s_looking_ahead_index = 0
                c_looking_ahead_index = 0

            if not c_len_shorter and not remaining_str:
                if m_line['start'] == '':
                    m_line['start'] = s_line['start']
                m_line['end'] = s_line['end']
                m_line['delta'] = m_line['delta'] + s_line['delta']

                if debug: print('EXACT SYNCED MERGE --->', m_line)
                c_i += 1
                s_i += (1 + s_looking_ahead_index)
                s_looking_ahead_index = 0
                c_looking_ahead_index = 0

            if c_len_shorter and remaining_str:
                if m_line['start'] == '':
                    m_line['start'] = s_line['start']

                ratio = float(match_end) / float(len(s_lyric_norm))
                d = round(s_line['delta'] * ratio, 2)

                time_object = datetime.strptime(s_line['start'], '%M:%S:%f').time()
                new_start = str(((datetime.combine(datetime.now(), time_object)) + timedelta(seconds=d)).time())
                if debug: print('new_start', s_line['start'], (datetime.combine(datetime.now(), time_object)), new_start, d)

                if new_start.find('.') > 0:
                    pattern = r"\d{2}:(\d{2}:\d{2}:\d{2})"
                    new_start = re.findall(pattern, new_start.replace('.', ':'))[0]
                else:
                    pattern = r"(\d{2}:\d{2}:\d{2})"
                    new_start = re.findall(pattern, new_start)[0]
                if debug: print('new_start', s_line['start'], (datetime.combine(datetime.now(), time_object)), new_start, d)
                s_line['start'] = new_start
                s_line['delta'] = round(s_line['delta'] - d, 2)
                s_line['lyric'] = remaining_str

                m_line['delta'] = m_line['delta'] + d
                m_line['end'] = new_start
                check_color = True
                                
                c_i += 1
                s_i += s_looking_ahead_index
                s_looking_ahead_index = 0

                if debug: print('PARTIAL S_LINE MERGE --->', m_line)

            if not c_len_shorter and remaining_str:
                if m_line['start'] == '':
                    m_line['start'] = s_line['start']
                c_line['lyric'] = remaining_str
                m_line['delta'] = m_line['delta'] + s_line['delta']

                time_object = datetime.strptime(s_line['start'], '%M:%S:%f').time()
                new_end = str(((datetime.combine(datetime.now(), time_object)) + timedelta(seconds=m_line['delta'])).time())
                if new_end.find('.') > 0:
                    pattern = r"\d{2}:(\d{2}:\d{2}:\d{2})"
                    new_end = re.findall(pattern, new_end.replace('.', ':'))[0]
                else:
                    pattern = r"(\d{2}:\d{2}:\d{2})"
                    new_end = re.findall(pattern, new_end)[0]

                m_line['end'] = new_end

                s_i += 1
                c_i += c_looking_ahead_index
                c_looking_ahead_index = 0
                check_color = True

                if debug: print('PARTIAL C_LINE MERGE --->', m_line)

        else:
            if check_color:
                c_looking_ahead_index += 1
                s_looking_ahead_index = 0
                if debug: print("CHECK COLOR")
            else: 
                s_looking_ahead_index += 1
                c_looking_ahead_index = 0
                if debug: print("CHECK SYNCED")

        if s_looking_ahead_index > looking_ahead_max:
            s_looking_ahead_index = 0
            if not check_color:
                s_i += 1
                c_i += 1
            if debug: print("reset all")

        if c_looking_ahead_index > looking_ahead_max:
            c_looking_ahead_index = 0
            if not check_color:
                c_i += 1
            else:
                check_color = False
            if debug: print("c_looking_ahead_index reset")
        
        if s_looking_ahead_index > looking_ahead_max:
            s_looking_ahead_index = 0
            s_i += 1
            if debug: print("s_looking_ahead_index reset")

        if debug: print()

    key_order = ['start', 'end', 'delta', 'section_name', 'section', 'line', 'member', 'lyric'] 
    merged_lines = [
        {k: entry[k] for k in key_order if k in entry} 
        for entry in merged_lines
    ]

    print('done merge')
    return merged_lines

# for m in merge_singular(colored_lyrics, synced_lyrics, 1, True):
#     print(m)
        
#     return {"merged_lines": merged_lines, "unmerged_line_color": unmerged_line_color, "unmerged_line_synced": unmerged_line_synced}

# merge_singular(colored_lyrics, synced_lyrics, 1, True)