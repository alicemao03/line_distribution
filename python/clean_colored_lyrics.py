import re
import requests
from bs4 import BeautifulSoup, NavigableString, Tag
import json
import csv
from datetime import datetime
from num2words import num2words



# NORMALIZE LYRICS
def normalize_lyrics(text):
    text = text.lower()
    text = "".join(text.split())
    text = re.sub(r'[\n\(]', '', text)
    text = re.sub(r'[^\w\s가-힣]', '', text)
    text = re.sub(r'\d+', lambda m: num2words(int(m.group(0))), text)
    text = re.sub(r'\s+', '', text).strip()
    return text


# GET RAW LYRICS
def get_soup(song):
    url_path = "../json/urls.json"

    with open(url_path, 'r') as file:
        all_urls = json.load(file)

    url = ''
    for u in all_urls:
        if u['name'] == song:
            url = u['url']
            print("url found:", url)
    
    response = requests.get(url)

    soup = BeautifulSoup(response.text, 'html.parser')
    soup = soup.body
    return soup
    

# GET THE CORRESPONDING COLOR FOR EACH MEMBER
def get_color_key(color_key):
    colors = color_key.find_all('span')
    # print(colors)
    color_coded_key = {}
    members = []

    for c in colors:
        hex_re = r"\#([a-zA-Z0-9]{6})"
        hex_value = re.findall(hex_re, c['style'])

        if not hex_value:
            print('something broke in finding color key')
            return []
        
        name = c.text.lower().capitalize()
        if 'coups' in name:
            name = 'S. Coups'
    
        color_coded_key.update({hex_value[0]: name})
        members.append(name)
    return color_coded_key
    
# NORMALIZING HTML
def clean_main_body_html(html_results):
    combined_lines_test = ''
    line = ''

    if not isinstance(html_results, list):
        html_results = list(html_results)


    i = 0
    while i < len(html_results):
        line = html_results[i]
        if isinstance(line, Tag) and line.name == 'p':
            combined_lines_test += '<p>'
            combined_lines_test += clean_main_body_html(line.children)
            combined_lines_test += '</p>'
       

        if isinstance(line, Tag) and line.name == 'br':
            combined_lines_test += str(line)
    

        if isinstance(line, Tag) and line.name == 'span':
            combined_lines_test += str(line)
    
            
        if isinstance(line, NavigableString):
            combine_members = ''

            if line.strip() == '[':
                not_bracket = True
                shared_lyrics = ''

                while not_bracket:
                    i += 1
                    line = html_results[i]
                    if line.name == 'span':
                        hex = line['style'].split('#')[1]
                        combine_members += (' #'+ hex)
                     
                    elif isinstance(line, NavigableString):
                        if "]" in line.strip():
                            shared_lyrics = line.strip().split(']')[1]
                            not_bracket = False
                    
                insert_line = f"<span class='multiple_members' style='color:{combine_members}'>{shared_lyrics}</span>"
                line.insert_before(insert_line)
                combined_lines_test += insert_line
            else:
                combined_lines_test += (' ' + line.strip())
        i += 1
    return combined_lines_test


# HTML FORMAT WITH CONTAINERS
def get_color_lyrics_with_container(soup):
    body = soup.find("div", class_="wp-block-group__inner-container is-layout-flow wp-block-group-is-layout-flow")

    find_divs = body.findAll('div', recursive=False)

    color_key = get_color_key(body.find('p', recursive=False))
    main_lyrics_body = find_divs[-1]

    # Hangul lyrics
    find_main_lyrics_body = main_lyrics_body.find_all("div", class_="wp-block-group__inner-container is-layout-flow wp-block-group-is-layout-flow")

    if (len(find_main_lyrics_body) >= 3):
        main_lyrics_body = main_lyrics_body.find_all("div", class_="wp-block-group__inner-container is-layout-flow wp-block-group-is-layout-flow")[1]
        main_lyrics_body = main_lyrics_body.findAll("div")[-1]
        main_lyrics_body = clean_main_body_html(main_lyrics_body)

    else:
        main_lyrics_body = body.find(string='English')
        tag = main_lyrics_body.parent

        while not tag.name == 'p':
            tag = tag.parent
        tag = tag.find_next_siblings('p')
        
        new_html = []
        for t in tag:
            if not t.name == 'p':
                break
            new_html.append(t)

        main_lyrics_body = clean_main_body_html(new_html)
    return {"color_key": color_key, "main_lyrics_body": main_lyrics_body}

def get_unit(color_key):
    units = {'Vocal': ['Woozi', 'Jeonghan', 'Joshua', 'Dk', 'Seungkwan'],
             'Hip Hop': ['S. Coups', 'Mingyu', 'Vernon', 'Wonwoo'],
             'Performance': ['Hoshi', 'Jun', 'The8', 'Dino'],
             'BSS': ['Dk', 'Hoshi', 'Seungkwan'],
             '95s': ['S. Coups', 'Jeonghan', 'Joshua'],
             '96s': ['Hoshi', 'Jun', 'Woozi', 'Wonwoo'],
             '97s': ['The8', 'Mingyu', 'Dk'],
             'Maknae': ['Seungkwan', 'Vernon', 'Dino'],
             'Leaders': ['S. Coups', 'Woozi', 'Hoshi'],
             'China': ['Jun', 'The8']
            }
    
    
    all_members = set(color_key.values())

    if len(all_members) >= 12:
        return 'OT13'

    for name, members in units.items():
        if set(members) == all_members:
            return name

    return sorted(all_members).joing(', ')

# HTML FORMAT WITH TABLES
def get_color_lyrics_with_table(soup):
    body = soup.findAll("table")

    if (len(body) > 1):
        song_header = body[0]
        main_lyrics_body = body[1]
        color_key = get_color_key(song_header.findAll('td')[2])
       
    else:
        main_lyrics_body = body[0]
        song_header = soup.find('div', class_='wp-block-column is-layout-flow wp-block-column-is-layout-flow')
        color_key = get_color_key(song_header.find('p'))

    main_lyrics_body = main_lyrics_body.findAll("td")[1]
    main_lyrics_body = clean_main_body_html(main_lyrics_body.children)
    
    return {"song_header": song_header, "color_key": color_key, "main_lyrics_body": main_lyrics_body}

# GET THE DATASET OF COLORED_LYRICS
def get_colored_lyrics(html):

    lyrics = html['main_lyrics_body']
    color_coded_key = html['color_key']

    for br in lyrics.find_all("br"):
        br.decompose()
    
    colored_lyrics = []
    section_num = 0
    line_num = 0
    members = []

    span_lyrics_html = lyrics.find_all('span', recursive=False)

    for s in span_lyrics_html:
        print('something broke', s)


    colored_lyrics_html = lyrics.find_all('p')
    for c in colored_lyrics_html:
        

        line_num = 0
        for line in c:
            text = normalize_lyrics(line.text)
            
            if text:
                if line.name == 'span':
                    members = []
                    hex_re = r"\#([a-zA-Z0-9]{6})"
                    hex_value = re.findall(hex_re, line['style'])

                    for hex in hex_value:
                        if hex in color_coded_key:
                            members.append(color_coded_key[hex])
                        else:
                            members = ['ALL']
                else:
                    members = ["adlib"]
                colored_lyrics.append({'member': members, 'lyric':line.text, 'section': section_num, 'line': line_num})
                line_num += 1
        section_num += 1
    return colored_lyrics


# MAIN FUNCTION
def get_raw_color_coded_html(song):
    soup = get_soup(song)

    html_results = []
    if soup.find(('table')) != None:
        html_results = get_color_lyrics_with_table(soup)
    else:
        html_results = get_color_lyrics_with_container(soup)

    lyrics = html_results['main_lyrics_body'].strip()
    
    p_index = lyrics.find('<p>')
    if p_index:
        print('found raw color html')
        lyrics = '<p>' + lyrics[:p_index] + '</p>' + lyrics[p_index:]

    color_key = html_results['color_key']
    main_lyrics_body = BeautifulSoup(lyrics, 'html.parser')
    unit = get_unit(color_key)

    return {'unit': unit, 'color_key': color_key, 'main_lyrics_body': main_lyrics_body}


def export_testing_html(html):
    with open('../html/testing.html', 'w') as f:
        f.write(html)
