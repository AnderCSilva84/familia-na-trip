import{WifiOff,Star,Volume2,HandHeart,Coffee}from'lucide-react';import type{ReactNode}from'react';import{speechService}from'../services/speechService'
export const Button=({children,className='',...p}:React.ButtonHTMLAttributes<HTMLButtonElement>)=><button className={`button ${className}`} {...p}>{children}</button>
export const Card=({children,className=''}:{children:ReactNode;className?:string})=><section className={`card ${className}`}>{children}</section>
export const StarCounter=({value}:{value:number})=><span className="stars"><Star fill="currentColor"/> {value} estrelas</span>
export const AudioButton=({text}:{text:string})=><Button onClick={()=>speechService.speak(text)}><Volume2/> Ouvir instrução</Button>
export const HelpButton=({onClick}:{onClick:()=>void})=><Button onClick={onClick}><HandHeart/> Preciso de ajuda</Button>
export const PauseButton=({onClick}:{onClick:()=>void})=><Button onClick={onClick}><Coffee/> Preciso de uma pausa</Button>
export function OfflineBanner(){const offline=!navigator.onLine;return offline?<div className="offline" role="status"><WifiOff/> Estamos sem internet, mas suas missões continuam disponíveis.</div>:null}
export const LoadingState=()=> <p role="status">O Benji está preparando tudo...</p>
export const EmptyState=({children}:{children:ReactNode})=><Card><p className="empty">{children}</p></Card>
