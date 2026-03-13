export default function AuraLogo({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
    const scale = size === 'small' ? 0.75 : size === 'large' ? 1.5 : 1;
    
    return (
        <div 
            style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                lineHeight: 1,
                transform: `scale(${scale})`,
                transformOrigin: 'left center'
            }}
        >
            <span 
                style={{ 
                    fontFamily: 'var(--font-great-vibes), cursive', 
                    fontSize: 40, 
                    color: '#C89F53', 
                    marginBottom: -8,
                    fontWeight: 400
                }}
            >
                Aura
            </span>
            <span 
                style={{ 
                    fontFamily: 'var(--font-montserrat), sans-serif', 
                    fontSize: 11, 
                    letterSpacing: '0.3em', 
                    color: '#C89F53', 
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    marginLeft: '0.3em' // offset tracking
                }}
            >
                Boutique
            </span>
        </div>
    );
}
