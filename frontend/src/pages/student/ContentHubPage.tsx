import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FileText, PlayCircle, Search, BookOpen } from 'lucide-react'
import {
  CATEGORIES,
  DEFAULT_DEMO_PDF_URL,
  DEFAULT_DEMO_VIDEO_URL,
  PDFS,
  VIDEOS,
  type PdfResource,
  type VideoResource,
} from '../../data/contentVault'
import '../../styles/content-hub.css'

type HubTab = 'videos' | 'pdfs'

interface HubLocationState {
  openVideoId?: string
  openPdfId?: string
}

export default function ContentHubPage() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<HubTab>('videos')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedVideo, setSelectedVideo] = useState<VideoResource | null>(null)
  const [selectedPdf, setSelectedPdf] = useState<PdfResource | null>(null)
  const pdfPreviewStartedAtRef = useRef<number | null>(null)
  const [pdfProgressById, setPdfProgressById] = useState<Record<string, number>>(() =>
    Object.fromEntries(PDFS.map(pdf => [pdf.id, pdf.progress])),
  )

  useEffect(() => {
    const state = location.state as HubLocationState | null
    if (state?.openVideoId) {
      const video = VIDEOS.find(v => v.id === state.openVideoId)
      if (video) { setActiveTab('videos'); setSelectedVideo(video) }
    } else if (state?.openPdfId) {
      const pdf = PDFS.find(p => p.id === state.openPdfId)
      if (pdf) { setActiveTab('pdfs'); setSelectedPdf(pdf); pdfPreviewStartedAtRef.current = Date.now() }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openVideoPreview = (video: VideoResource) => {
    setSelectedVideo(video)
  }

  const openPdfPreview = (pdf: PdfResource, startedAtMs: number) => {
    setSelectedPdf(pdf)
    pdfPreviewStartedAtRef.current = startedAtMs
  }

  const closePdfPreview = (endedAtMs: number) => {
    if (selectedPdf && pdfPreviewStartedAtRef.current !== null) {
      const dwellSeconds = Math.floor((endedAtMs - pdfPreviewStartedAtRef.current) / 1000)

      if (dwellSeconds >= 5) {
        const earnedProgress = Math.max(2, Math.min(12, Math.floor(dwellSeconds / 6)))

        setPdfProgressById(previous => {
          const current = previous[selectedPdf.id] ?? selectedPdf.progress
          return {
            ...previous,
            [selectedPdf.id]: Math.min(100, current + earnedProgress),
          }
        })
      }
    }

    setSelectedPdf(null)
    pdfPreviewStartedAtRef.current = null
  }

  const filteredVideos = useMemo(
    () =>
      VIDEOS.filter(video => {
        const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = activeCategory === 'All' || video.subject === activeCategory
        return matchesSearch && matchesCategory
      }),
    [searchTerm, activeCategory],
  )

  const filteredPdfs = useMemo(
    () =>
      PDFS.filter(pdf => {
        const matchesSearch = pdf.title.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = activeCategory === 'All' || pdf.subject === activeCategory
        return matchesSearch && matchesCategory
      }),
    [searchTerm, activeCategory],
  )

  return (
    <div className="content-hub-page">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1>Content Hub</h1>
        <p>Access curated PDFs and videos linked to your roadmap and weak subjects.</p>
      </div>

      <div className="hub-controls">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <PlayCircle size={16} /> Videos
          </button>
          <button
            className={`tab-btn ${activeTab === 'pdfs' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdfs')}
          >
            <FileText size={16} /> PDFs
          </button>
        </div>

        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search resources"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {CATEGORIES.map(category => (
          <button
            key={category}
            className={`mode-btn ${activeCategory === category ? 'active' : ''}`}
            style={{ flex: '0 0 auto', padding: '0.45rem 0.8rem' }}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {activeTab === 'videos' ? (
        <div className="video-grid">
          {filteredVideos.map(video => (
            <article
              className="card video-card"
              key={video.id}
              role="button"
              tabIndex={0}
              onClick={() => openVideoPreview(video)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openVideoPreview(video)
                }
              }}
            >
              <div className="video-thumbnail">
                <PlayCircle size={44} className="play-overlay" />
                <span className="duration-badge">{video.duration}</span>
              </div>
              <div className="video-info">
                <span className="subject-tag">{video.subject}</span>
                <h3>{video.title}</h3>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${video.progress}%` }} />
                  </div>
                  <span className="progress-text">{video.progress}%</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="pdf-grid">
          {filteredPdfs.map(pdf => {
            const pdfProgress = pdfProgressById[pdf.id] ?? pdf.progress

            return (
              <article
                className="card pdf-card"
                key={pdf.id}
                role="button"
                tabIndex={0}
                onClick={event => openPdfPreview(pdf, event.timeStamp)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openPdfPreview(pdf, event.timeStamp)
                  }
                }}
              >
                <div className="pdf-icon-wrapper">
                  <BookOpen size={42} color="#3730A3" />
                </div>
                <div className="pdf-info">
                  <span className="subject-tag">{pdf.subject}</span>
                  <h3>{pdf.title}</h3>
                  <p className="pages-text">{pdf.pages} pages</p>
                  <div className="progress-container" style={{ marginTop: '0.5rem' }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pdfProgress}%` }} />
                    </div>
                    <span className="progress-text">{pdfProgress}%</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {selectedVideo ? (
        <div className="video-modal-backdrop" role="dialog" aria-modal="true" aria-label="Video preview modal">
          <div className="video-modal-card">
            <div className="video-modal-header">
              <div>
                <p className="video-modal-subject">{selectedVideo.subject}</p>
                <h2>{selectedVideo.title}</h2>
              </div>
              <button className="video-modal-close" onClick={() => setSelectedVideo(null)} aria-label="Close preview">
                ✕
              </button>
            </div>

            <video
              className="video-modal-player"
              controls
              controlsList="nodownload"
              disablePictureInPicture
              autoPlay
              preload="metadata"
              src={selectedVideo.videoUrl ?? DEFAULT_DEMO_VIDEO_URL}
              onContextMenu={event => event.preventDefault()}
            />

            <p className="video-modal-note">
              Demo mode: this is a placeholder stream to preview the real learner video experience.
            </p>
          </div>
        </div>
      ) : null}

      {selectedPdf ? (
        <div className="video-modal-backdrop" role="dialog" aria-modal="true" aria-label="PDF preview modal">
          <div className="video-modal-card pdf-modal-card">
            <div className="video-modal-header">
              <div>
                <p className="video-modal-subject">{selectedPdf.subject}</p>
                <h2>{selectedPdf.title}</h2>
              </div>
              <button
                className="video-modal-close"
                onClick={event => closePdfPreview(event.timeStamp)}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <iframe
              className="pdf-modal-frame"
              title={`${selectedPdf.title} preview`}
              src={`${selectedPdf.pdfUrl ?? DEFAULT_DEMO_PDF_URL}#toolbar=0&navpanes=0`}
            />

            <p className="video-modal-note">
              Demo mode: sample document preview for learner PDF reading experience.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}