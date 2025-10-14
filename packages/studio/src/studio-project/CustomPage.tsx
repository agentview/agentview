import { Header, HeaderTitle } from "~/components/header"

function ColorAvatar({ letter, color }: { letter: string, color: string }) {
  return <div className={`relative size-[24px] ${color} rounded-full flex justify-center items-center text-black `}>
    <span style={{fontSize: "12px", lineHeight: 1, opacity: 0.8, marginTop: "1px"}}>{letter}</span>
  </div>
}


export function CustomPage() {
  return <div className="flex-1">
    <Header>
      <HeaderTitle title={`Custom Page`} />
    </Header>
    <div className="p-6">
      
      <div className="flex flex-row gap-2">
        {[
          { letter: "R", color: "bg-red-100" },
          { letter: "O", color: "bg-orange-100" },
          { letter: "A", color: "bg-amber-100" },
          { letter: "Y", color: "bg-yellow-100" },
          { letter: "L", color: "bg-lime-100" },
          { letter: "G", color: "bg-green-100" },
          { letter: "E", color: "bg-emerald-100" },
          { letter: "T", color: "bg-teal-100" },
          { letter: "C", color: "bg-cyan-100" },
          { letter: "S", color: "bg-sky-100" },
          { letter: "B", color: "bg-blue-100" },
          { letter: "I", color: "bg-indigo-100" },
          { letter: "V", color: "bg-violet-100" },
          { letter: "P", color: "bg-purple-100" },
          { letter: "F", color: "bg-fuchsia-100" },
          { letter: "K", color: "bg-pink-100" },
          { letter: "R", color: "bg-rose-100" },
          { letter: "S", color: "bg-slate-100" },
          { letter: "G", color: "bg-gray-100" },
          { letter: "Z", color: "bg-zinc-100" },
          { letter: "N", color: "bg-neutral-100" },
          { letter: "S", color: "bg-stone-100" },
        ].map((item, idx) => (
          <ColorAvatar key={idx} letter={item.letter} color={item.color} />
        ))}
      </div>

{/* 
      <div className="flex flex-row gap-2">
        {[
          { letter: "R", color: "bg-red-800" },
          { letter: "O", color: "bg-orange-800" },
          { letter: "A", color: "bg-amber-800" },
          { letter: "Y", color: "bg-yellow-800" },
          { letter: "L", color: "bg-lime-800" },
          { letter: "G", color: "bg-green-800" },
          { letter: "E", color: "bg-emerald-800" },
          { letter: "T", color: "bg-teal-800" },
          { letter: "C", color: "bg-cyan-800" },
          { letter: "S", color: "bg-sky-800" },
          { letter: "B", color: "bg-blue-800" },
          { letter: "I", color: "bg-indigo-800" },
          { letter: "V", color: "bg-violet-800" },
          { letter: "P", color: "bg-purple-800" },
          { letter: "F", color: "bg-fuchsia-800" },
          { letter: "K", color: "bg-pink-800" },
          { letter: "R", color: "bg-rose-800" },
          { letter: "S", color: "bg-slate-800" },
          { letter: "G", color: "bg-gray-800" },
          { letter: "Z", color: "bg-zinc-800" },
          { letter: "N", color: "bg-neutral-800" },
          { letter: "S", color: "bg-stone-800" },
        ].map((item, idx) => (
          <ColorAvatar key={idx} letter={item.letter} color={item.color} />
        ))}
      </div> */}


      <div className="pt-10 prose">
        <h1>Header 1</h1>
        <p>This is a sample paragraph to test basic text styling. The <strong>prose</strong> class applies nice default styles to all HTML elements inside. <em>Emphasized text</em> and <b>bold text</b> should render distinctly.</p>
        <p>This is a sample paragraph to test basic text styling. The <strong>prose</strong> class applies nice default styles to all HTML elements inside. <em>Emphasized text</em> and <b>bold text</b> should render distinctly.</p>
        <p>This is a sample paragraph to test basic text styling. The <strong>prose</strong> class applies nice default styles to all HTML elements inside. <em>Emphasized text</em> and <b>bold text</b> should render distinctly.</p>

        <h2>Header 2</h2>
        <p>This is another paragraph demonstrating <a href="#">link styling</a> and how links with <u>underline</u> look.</p>
        
        <h3>Header 3</h3>
        <blockquote>
          This is a blockquote. Blockquotes are often used to cite someone else's words.
        </blockquote>

        <p>
          Here is an inline code example: <code>const foo = 'bar';</code>
        </p>

        <h4>Header 4</h4>
        <pre>
{`function helloWorld() {
  console.log("Hello, World!");
}
`}
        </pre>

        <h5>Header 5</h5>
        <p>Unordered list example:</p>
        <ul>
          <li>First bullet item</li>
          <li>Second bullet item with <b>bold</b> text</li>
          <li>
            Nested list:
            <ul>
              <li>Sub-item 1</li>
              <li>Sub-item 2</li>
            </ul>
          </li>
        </ul>

        <h6>Header 6</h6>
        <p>Ordered list example:</p>
        <ol>
          <li>First item</li>
          <li>Second item
            <ol>
              <li>Nested first</li>
              <li>Nested second</li>
            </ol>
          </li>
          <li>Third item</li>
        </ol>

        <p>Definition List:</p>
        <dl>
          <dt>Term 1</dt>
          <dd>This is the definition for term 1.</dd>
          <dt>Term 2</dt>
          <dd>This is the definition for term 2.</dd>
        </dl>

        <p>Table Example:</p>
        <table>
          <thead>
            <tr>
              <th>Header A</th>
              <th>Header B</th>
              <th>Header C</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Row 1A</td>
              <td>Row 1B</td>
              <td>Row 1C</td>
            </tr>
            <tr>
              <td>Row 2A</td>
              <td>Row 2B</td>
              <td>Row 2C</td>
            </tr>
          </tbody>
        </table>

        <hr />

        <h2>Forms and Inputs</h2>
        <form>
          <div>
            <label htmlFor="fname">First name:</label>
            <input id="fname" name="fname" type="text" placeholder="John" />
          </div>
          <div>
            <label htmlFor="lname">Last name:</label>
            <input id="lname" name="lname" type="text" placeholder="Doe" />
          </div>
          <div>
            <label>
              <input type="checkbox" /> Check me
            </label>
          </div>
          <div>
            <label>
              <input type="radio" name="group1" /> Option 1
            </label>
            <label>
              <input type="radio" name="group1" /> Option 2
            </label>
          </div>
          <button type="submit">Submit</button>
        </form>

        <h2>Images</h2>
        <p>
          Here is an image:
        </p>
        <img
          src="https://placekitten.com/200/100"
          alt="A cute kitten"
          style={{ maxWidth: "100%", borderRadius: "8px" }}
        />

        <h2>Other Elements</h2>
        <details>
          <summary>Expandable Section</summary>
          <p>This content is hidden until the section is expanded.</p>
        </details>

        <p>
          <mark>Highlighted text using &lt;mark&gt; tag.</mark>
        </p>

        <p>
          <del>This line is deleted (strikethrough).</del>
        </p>

        <p>
          Small text example: <small>This text is small.</small>
        </p>

        <p>
          <sup>Superscript</sup> and <sub>Subscript</sub> text styles.
        </p>

        <h2>Horizontal Rule</h2>
        <hr />

        <h2>To-Do List Example</h2>
        <ul className="list-none pl-0">
          <li>
            <input type="checkbox" checked readOnly /> Completed task
          </li>
          <li>
            <input type="checkbox" readOnly /> Ongoing task
          </li>
        </ul>
      </div>
    </div>
  </div>
}

