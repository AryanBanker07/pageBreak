export default function FAQ() {
  return (
    <div className="max-w-[800px] mx-auto mt-24 mb-12">
      <h2 
        className="text-xl font-semibold mb-6"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Frequently Asked Questions
      </h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Why does Apple Notes cut through my handwriting when exporting to PDF?</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Apple Notes exports handwritten content as a continuous document and inserts page breaks at fixed intervals without analyzing the content. This often results in text, drawings, and images being sliced in half at page boundaries. PageBreak fixes this by intelligently detecting whitespace gaps between your content lines.</p>
        </div>
        
        <div>
          <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Is my data safe? Does PageBreak upload my files?</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Yes, your data is completely safe. PageBreak processes everything 100% in your browser using client-side JavaScript. Your PDF and image files are never uploaded to any server. No data ever leaves your device.</p>
        </div>
        
        <div>
          <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>What file formats does PageBreak support?</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>PageBreak accepts PDF files and image formats including PNG, JPG/JPEG, and WebP. You can upload a multi-page continuous PDF exported from Apple Notes, or a long screenshot of your handwritten notes.</p>
        </div>
        
        <div>
          <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Does PageBreak work with dark mode or colored backgrounds?</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Yes. PageBreak uses a color-agnostic variance-based detection algorithm that works with any text color on any background color, including dark mode notes, colored stationery, and documents with embedded images.</p>
        </div>
        
        <div>
          <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Is PageBreak free to use?</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Yes, PageBreak is completely free. There are no usage limits, no sign-up required, and no watermarks on the output PDF.</p>
        </div>
      </div>
    </div>
  );
}
