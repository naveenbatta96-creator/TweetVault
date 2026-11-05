package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"tweetvault/database"
)

type FetchTweetRequest struct {
	URL string `json:"url"`
}

type fxAuthor struct {
	Name       string `json:"name"`
	ScreenName string `json:"screen_name"`
	AvatarURL  string `json:"avatar_url"`
}

type fxMediaItem struct {
	Type string `json:"type"`
	URL  string `json:"url"`
}

type fxMedia struct {
	All    []fxMediaItem `json:"all"`
	Photos []fxMediaItem `json:"photos"`
	Videos []fxMediaItem `json:"videos"`
	Gifs   []fxMediaItem `json:"gifs"`
}

type fxTweet struct {
	Text      string   `json:"text"`
	Author    fxAuthor `json:"author"`
	Likes     int      `json:"likes"`
	Retweets  int      `json:"retweets"`
	Replies   int      `json:"replies"`
	CreatedAt string   `json:"created_at"`
	Media     *fxMedia `json:"media"`
}

type fxResponse struct {
	Code    int      `json:"code"`
	Message string   `json:"message"`
	Tweet   *fxTweet `json:"tweet"`
}

type FetchedTweetResult struct {
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	AuthorName    string   `json:"author_name"`
	AuthorHandle  string   `json:"author_handle"`
	AuthorAvatar  string   `json:"author_avatar"`
	MediaURL      string   `json:"media_url"`
	OriginalURL   string   `json:"original_url"`
	LikesCount    int      `json:"likes_count"`
	RetweetsCount int      `json:"retweets_count"`
	Tags          []string `json:"tags"`
}

var tweetIDRegex = regexp.MustCompile(`(?:twitter\.com|x\.com)(?:/([^/]+))?/status/(\d+)`)
var hashtagRegex = regexp.MustCompile(`#[a-zA-Z0-9_\p{L}]+`)

func FetchTweet(w http.ResponseWriter, r *http.Request) {
	var req FetchTweetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	trimmedURL := strings.TrimSpace(req.URL)
	if trimmedURL == "" {
		writeError(w, http.StatusBadRequest, "URL is required")
		return
	}

	matches := tweetIDRegex.FindStringSubmatch(trimmedURL)
	if len(matches) < 3 {
		writeError(w, http.StatusBadRequest, "Could not find a valid tweet ID in URL. Expecting format https://x.com/user/status/12345")
		return
	}
	screenName := matches[1]
	tweetID := matches[2]
	if tweetID == "" && matches[1] != "" {
		// Fallback if matched differently
		tweetID = matches[1]
		screenName = ""
	}

	var candidateURLs []string
	if screenName != "" && screenName != "i" && screenName != "status" {
		candidateURLs = append(candidateURLs, fmt.Sprintf("https://api.fxtwitter.com/%s/status/%s", screenName, tweetID))
	}
	candidateURLs = append(candidateURLs, fmt.Sprintf("https://api.fxtwitter.com/status/%s", tweetID))

	client := &http.Client{Timeout: 15 * time.Second}
	var lastErr error
	var fxData fxResponse
	var fetchSucceeded bool

	for _, apiURL := range candidateURLs {
		httpReq, err := http.NewRequest("GET", apiURL, nil)
		if err != nil {
			lastErr = err
			continue
		}
		// Mimic browser to avoid anti-bot blocks
		httpReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
		httpReq.Header.Set("Accept", "application/json, text/plain, */*")
		httpReq.Header.Set("Referer", "https://twitter.com/")

		resp, err := client.Do(httpReq)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			lastErr = fmt.Errorf("HTTP %d from %s", resp.StatusCode, apiURL)
			continue
		}

		decodeErr := json.NewDecoder(resp.Body).Decode(&fxData)
		resp.Body.Close()
		if decodeErr != nil {
			lastErr = decodeErr
			continue
		}

		if fxData.Tweet != nil {
			fetchSucceeded = true
			break
		}
	}

	if !fetchSucceeded || fxData.Tweet == nil {
		errMsg := "Tweet not found, private, or could not be resolved from Twitter/X"
		if lastErr != nil {
			errMsg += ": " + lastErr.Error()
		}
		writeError(w, http.StatusNotFound, errMsg)
		return
	}

	tw := fxData.Tweet
	mediaDir, err := database.GetMediaDir()
	if err != nil {
		mediaDir = ""
	}

	// 1. Download author avatar locally
	localAvatar := tw.Author.AvatarURL
	if mediaDir != "" && localAvatar != "" {
		res := processSingleMedia(mediaDir, localAvatar)
		if res.Success {
			localAvatar = res.LocalURL
		}
	}

	// 2. Download all media items locally
	var localMediaURLs []string
	var mediaItemsToProcess []fxMediaItem
	if tw.Media != nil {
		if len(tw.Media.All) > 0 {
			mediaItemsToProcess = tw.Media.All
		} else {
			mediaItemsToProcess = append(mediaItemsToProcess, tw.Media.Photos...)
			mediaItemsToProcess = append(mediaItemsToProcess, tw.Media.Videos...)
			mediaItemsToProcess = append(mediaItemsToProcess, tw.Media.Gifs...)
		}
	}

	hasGif := false
	for _, m := range mediaItemsToProcess {
		if strings.ToLower(m.Type) == "gif" || strings.Contains(strings.ToLower(m.URL), ".gif") {
			hasGif = true
		}
		targetURL := m.URL
		if mediaDir != "" && targetURL != "" {
			res := processSingleMedia(mediaDir, targetURL)
			if res.Success {
				localMediaURLs = append(localMediaURLs, res.LocalURL)
			} else {
				localMediaURLs = append(localMediaURLs, targetURL)
			}
		} else if targetURL != "" {
			localMediaURLs = append(localMediaURLs, targetURL)
		}
	}

	mediaURLStr := ""
	if len(localMediaURLs) == 1 {
		mediaURLStr = localMediaURLs[0]
	} else if len(localMediaURLs) > 1 {
		b, _ := json.Marshal(localMediaURLs)
		mediaURLStr = string(b)
	}

	// 3. Extract hashtags
	rawTags := hashtagRegex.FindAllString(tw.Text, -1)
	tags := make([]string, 0)
	tagSet := make(map[string]bool)
	for _, t := range rawTags {
		clean := strings.TrimPrefix(t, "#")
		if !tagSet[clean] && clean != "" {
			tagSet[clean] = true
			tags = append(tags, clean)
		}
	}
	if hasGif && !tagSet["GIF"] && !tagSet["gif"] {
		tagSet["GIF"] = true
		tags = append(tags, "GIF")
	}
	if len(tags) == 0 {
		tags = []string{"Tweet"}
	}

	title := tw.Text
	if len(title) > 60 {
		title = title[:60] + "..."
	}

	handle := tw.Author.ScreenName
	if !strings.HasPrefix(handle, "@") {
		handle = "@" + handle
	}

	result := FetchedTweetResult{
		Title:         title,
		Content:       tw.Text,
		AuthorName:    tw.Author.Name,
		AuthorHandle:  handle,
		AuthorAvatar:  localAvatar,
		MediaURL:      mediaURLStr,
		OriginalURL:   trimmedURL,
		LikesCount:    tw.Likes,
		RetweetsCount: tw.Retweets,
		Tags:          tags,
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"tweet":   result,
	})
}

