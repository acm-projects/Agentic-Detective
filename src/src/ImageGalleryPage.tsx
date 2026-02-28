import React from 'react'
import './ImageGalleryPage.css'

// Dynamically import all PNGs from the assets folder next to the parent `src`.
// Vite supports import.meta.glob with `as: 'url'` to get static asset URLs.
const modules = import.meta.glob('../assets/*.png', { eager: true, as: 'url' })
const imageUrls = Object.values(modules) as string[]

export default function ImageGalleryPage(): JSX.Element {
  return (
    <div className="image-gallery-page">
      <h1>Image Gallery</h1>
      <div className="gallery">
        {imageUrls.map((src, i) => (
          <div key={i} className="card">
            <img src={src} alt={`image-${i}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
