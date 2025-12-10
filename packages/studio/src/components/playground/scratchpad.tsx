import { AlertCircleIcon, Link, WrenchIcon } from "lucide-react"
import { cn } from "~/lib/utils"
import { Button } from "../ui/button"

function NotionPill({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-row gap-1 items-center h-[20px] rounded-xs bg-gray-100 px-1 text-xs [&>*]:size-3 text-gray-700">
        {children}
    </div>
}

function NotionPillMedium({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("flex flex-row gap-1 items-center h-[28px] rounded-md bg-gray-100 px-2 text-sm [&>*]:size-4 text-gray-700", className)}>
        {children}
    </div>
}

function NotionPillMediumBold({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("flex flex-row gap-1 items-center h-[28px] rounded-md bg-gray-100 px-2 text-sm [&>*]:size-4 text-gray-600 font-medium ", className)}>
        {children}
    </div>
}

function LargePillOutline({ children }: { children: React.ReactNode }) {
    return <div className=" h-[27px] bg-gray-100 px-2 rounded-md text-sm flex items-center justify-center flex-row gap-1 [&>*]:size-4 text-gray-700">
        {children}
    </div>
}


function AlertBox({ children }: { children: React.ReactNode }) {
    return <div className=" rounded-md flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm">
        <AlertCircleIcon className="size-4 text-yellow-500" />
        {children}
    </div>
}   


// function MessageFooter(props: MessageFooterProps) {
//     const { session, run, listParams, item, onSelect, isSelected, onUnselect, isSmallSize } = props;
//     const [scoreDialogOpen, setScoreDialogOpen] = useState(false);

//     return <div className="mt-3 mb-8 ">

//         {/* <div className="flex flex-col gap-2 text-sm flex-wrap items-start">
//             <div className="flex flex-row gap-1 items-center text-sm">
//                 <NotionPill><TimerIcon /> 4s</NotionPill>
//                 <NotionPill>$1.25</NotionPill>
//                 <NotionPill>Neutral</NotionPill>
//             </div>
//             <AlertBox>This is a textual alert about something important.</AlertBox>
//         </div>

//         <div className="border-t mt-3 mb-2" /> */}
//         <div>
//             <div className="text-xs flex justify-between gap-2 items-start">
//                 <div className="flex flex-row flex-wrap gap-1.5 items-center">
//                     <LikeWidget />
//                     <Button variant="outline" size="xs" asChild>
//                         <Link to={`/sessions/${session.handle}?${toQueryParams({ ...listParams, itemId: item.id })}`}>
//                             <MessageCirclePlus />Comment
//                         </Link>
//                     </Button>

//                     {/* <Button variant="outline" size="xs"><ThumbsUp />Like</Button>
//                     <Button variant="outline" size="xs"><ThumbsDown />One, Two, Three and 3 others...</Button>
//                     <Button variant="outline" size="xs"><CircleGauge />Score</Button>
//                     <Button variant="outline" size="xs"><FilePenLineIcon />Edit</Button>
//                     <Button variant="outline" size="xs"><WorkflowIcon />Dog, Cattle, Hipopotamus and 2 others...</Button>
//                     <Button variant="outline" size="xs"><ChevronDown />More</Button>
//                     <Button variant="outline" size="xs"><AlertCircleIcon />Alert</Button>
//                     <Button variant="outline" size="xs"><TimerIcon />Time</Button>
//                     <Button variant="outline" size="xs"><MessageCirclePlus />Comment</Button>
//                     <Button variant="outline" size="xs"><MessageSquareTextIcon />Note</Button>
//                     <Button variant="outline" size="xs"><WrenchIcon />Tools</Button>
//                     <Button variant="outline" size="xs"><CircleGauge />Metrics</Button> */}
                    
//                     {/* <MultiSelectWidget /> */}
//                 </div>

//                 <div className="flex flex-row  items-center text-sm">
//                     {/* <Button variant="ghost" size="icon_xs" className="text-muted-foreground"><FilePenLineIcon /></Button> */}
//                     <Button variant="ghost" size="xs" className="text-muted-foreground" asChild>
//                         <Link to={`#`}><WrenchIcon className="size-4" />Run</Link>
//                     </Button>
//                 </div>
//             </div>
//         </div>


//     </div>
// }
