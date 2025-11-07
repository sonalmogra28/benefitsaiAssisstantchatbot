export default function Custom500() {
  return (
    <html>
      <head>
        <title>Server Error</title>
      </head>
      <body>
        <main style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif'}}>
          <div>
            <h1 style={{fontSize:'2rem',marginBottom:'0.5rem'}}>500 – Internal Server Error</h1>
            <p>Something went wrong. Please try again later.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
