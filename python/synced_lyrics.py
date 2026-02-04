import re
import requests
from datetime import datetime

# GET SONG INFO
def get_meta_data(song, artist, album):
    url = f"https://lrclib.net/api/search?artist_name={artist.replace(' ', '_')}&track_name={song.replace(' ', '_')}&albumName={album.replace(' ', '_')}"
    response = requests.get(url)
    print(song, artist, album, url)

    if response.status_code == 200:
        for r in response.json():
            if r['name'].lower() == song.lower() and r['artistName'].lower() == artist.lower() and r['syncedLyrics'] is not None:
                return r
        return "song not found"
    else:
        return "song not found"
    

# GET TIMES LYRICS
def get_synced_lyrics(song):
    synced_lyrics = ''

    file_path = "../official_times/"+ song +".srt"
    try:
        with open(file_path, 'r') as f:
            synced_lyrics = f.read()
            print(file_path, "found")
            return synced_lyrics
        
    except FileNotFoundError:
        print('file not found', file_path)
        return FileNotFoundError


# GET DELTAS FOR EACH LINE
def getDelta(line, replaceChar):
    time_format = "%M:%S:%f"

    start = datetime.strptime(line['start'].replace(replaceChar, ':'), time_format)
    end = datetime.strptime(line['end'].replace(replaceChar, ':'), time_format)

    return (end-start).total_seconds()
    # delta = str(end-start)
    # pattern = r"\d{1}:(\d{2}:\d{2}(?:\.\d{2})?)"
    # delta = re.findall(pattern, delta)[0]

    if "." not in delta:
        delta += ".00"
    
    delta = delta.replace('.', ':')
    return delta

def str_to_time(time, replaceChar):
    time_format = "%M:%S:%f"
    time = datetime.strptime(time.replace(replaceChar, ':'), time_format)
    return time

def time_to_sec(time):
    time = str_to_time(time, ":").time()
    time = (time.hour * 3600) + (time.minute * 60) + time.second + (time.microsecond / 1_000_000)
    return time

def decimal_sec_to_time_str(total_sec):
    minute = int(total_sec//60)
    sec = int(total_sec%60)
    tenths = int(round((total_sec % 1) * 100))

    return f"{minute:02}:{sec:02}:{tenths:02}"

def time_to_string(time):
    pattern = r"\d{1}:(\d{2}:\d{2}(?:\.\d{2})?)"
    time = re.findall(pattern, time)[0]

    if "." not in time:
        time += ".00"
    
    time = time.replace('.', ':')
    return time


def clean_official_lyrics(lyrics_raw):
    pattern = r"\d{2}:(\d{2}:\d{2},\d{2})\d{1} --> \d{2}:(\d{2}:\d{2},\d{2})\d{1}\s*([\s\S]*?)(?=\n\d+\n\d{2}:|$)"

    parsed_synced_lyrics = re.findall(pattern, lyrics_raw)

    new_synced_lyrics = []
    for line in parsed_synced_lyrics:
        start = line[0].replace(',', ':')
        end = line[1].replace(',', ':')
        newLine = {'start': start, 'end': end, 'lyric': line[2].replace('\n', ' ').strip()}
        newLine["delta"] = getDelta(newLine, ',')
        
        new_synced_lyrics.append(newLine)
    return new_synced_lyrics


def clean_lrclib_lyrics(lyrics_raw, duration):
    pattern = r"\[(\d{2}:\d{2}\.\d{2})\]\s*(.*?)(?=\[|$)"

    lyrics_raw = lyrics_raw.replace('\n', '')
    parsed_synced_lyrics = re.findall(pattern, lyrics_raw)

    new_synced_lyrics = []

    for i, line in enumerate(parsed_synced_lyrics):
        lyric = line[1]
        start = line[0].replace('.', ':')
        end = ''

        if lyric == '':
            continue

        if i + 1 >= len(parsed_synced_lyrics):
                minutes = int(duration/60)
                seconds = int(duration) % 60
                tenths = int(duration % 1 *10)
                end = f"{minutes:02}:{seconds:02}:{tenths:02}"
        else:
            end = parsed_synced_lyrics[i+1][0].replace('.', ':')

        newLine = {'start': start, 'end': end, 'lyric': lyric}
        newLine["delta"] = getDelta(newLine, '.')

        new_synced_lyrics.append(newLine)
            
    return new_synced_lyrics

#MAIN BODY
def get_song_info(song, artist, album):
    meta_data = get_meta_data(song, artist, album)
    print('meta_data', meta_data)

    if meta_data == "song not found":
        print("song not found")
        return "song not found"
    
    if meta_data['syncedLyrics'] is None:
        print('empyt synced lyrics')
        return "song not found"
    # print(meta_data['syncedLyrics'])
    lyrics_success = get_synced_lyrics(song)

    meta_data['syncedLyrics'] = clean_lrclib_lyrics(meta_data['syncedLyrics'],  meta_data['duration'])
    meta_data['source'] = 'lrclib'

    meta_data['name'] = re.sub(r'[*+&,]', '', song).replace(' ','')
    meta_data['trackName'] = song

    mv_synced = []
    if lyrics_success is not FileNotFoundError:
        mv_synced = clean_official_lyrics(lyrics_success)
        meta_data['source'] = 'MV'

        mv_start = time_to_sec(mv_synced[0]['start'])
        lib_start = time_to_sec(meta_data['syncedLyrics'][0]['start'])
        dif = mv_start - lib_start

        if dif > 1:
            for l in mv_synced:
                old_start = time_to_sec(l['start']) - dif
                old_end = time_to_sec(l['end']) - dif
                l['start'] = decimal_sec_to_time_str(old_start)
                l['end'] = decimal_sec_to_time_str(old_end)
        meta_data['syncedLyrics'] = mv_synced
        
    return meta_data