import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/rtf',
    ];

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.rtf'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExt) && !validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: PDF, DOCX, DOC, TXT, RTF' },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer and then to bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Forward to backend
    const backendFormData = new FormData();
    backendFormData.append('file', new Blob([buffer], { type: file.type }), file.name);

    const response = await fetch('http://localhost:8000/analyze-document', {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Backend error:', error);
      return NextResponse.json(
        { error: 'Backend analysis failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Map backend response to frontend format
    const analysisData = {
      success: data.success,
      documentAnalysis: {
        filename: file.name,
        size: file.size,
        type: file.type,
        ...data.document_analysis,
      },
      extractedText: data.extracted_text,
      threatAnalysis: data.threat_analysis,
      documentThreats: data.document_threat_indicators,
      scores: data.threat_analysis?.scores || {},
    };

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
